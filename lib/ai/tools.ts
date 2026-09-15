import { parsePagination } from "@/lib/api/pagination";
import { getProjectBoqs, getBoqById } from "@/lib/boq";
import type { BoqItemProgress } from "@/lib/boq/types";
import {
  getExpenseCategoryTotals,
  getProjectCostDashboard,
  getRecentProjectCostOverviews,
} from "@/lib/costs";
import { getDailyReports, getRecentDailyReports } from "@/lib/daily-reports";
import { getProjectExpenses, getProjectExpenseStats } from "@/lib/expenses";
import { getLabourSummary, getLabourTodayStats } from "@/lib/labour";
import { getProjectMaterialsDashboard } from "@/lib/materials";
import { getProjectById, getProjects } from "@/lib/projects/queries";
import { getProjectQuotationSummary } from "@/lib/quotations";
import { createClient } from "@/lib/supabase/server";
import type {
  AIBOQItemSnapshot,
  AIBOQSnapshot,
  AIActiveProjectSnapshot,
  AIEstimateVsActualSnapshot,
  AIExpenseSnapshot,
  AILabourSnapshot,
  AIMaterialSnapshot,
  AIMeasurementSnapshot,
  AIPhotoMetadataSnapshot,
  AIProjectCostSnapshot,
  AIProjectOverview,
  AIQuotationSnapshot,
  AISiteReportSnapshot,
  AIStockSnapshot,
  AIToolResult,
} from "@/lib/ai/types";
import { PROJECT_STATUS_LABELS } from "@/constants/project";

type ProjectAccess =
  | { ok: true; projectId: string; businessId: string; name: string }
  | { ok: false; error: "not_found" | "failed"; message: string };

async function requireProject(projectId: string): Promise<ProjectAccess> {
  const result = await getProjectById(projectId);

  if (result.error === "not_found" || !result.project) {
    return {
      ok: false,
      error: result.error === "not_found" ? "not_found" : "failed",
      message:
        result.error === "not_found"
          ? "You don't have access to this project."
          : (result.error ?? "Unable to load this project."),
    };
  }

  return {
    ok: true,
    projectId: result.project.id,
    businessId: result.project.business_id,
    name: result.project.name,
  };
}

function mapBOQItem(item: BoqItemProgress): AIBOQItemSnapshot {
  return {
    description: item.description,
    section: item.section_name,
    unit: item.unit,
    estimated_quantity: item.estimated_quantity,
    completed_quantity: item.completed_quantity,
    remaining_quantity: item.remaining_quantity,
    estimated_amount: item.estimated_amount,
    completed_value: item.completed_value,
    remaining_value: item.remaining_value,
    completion_percentage: item.completion_percentage,
    completion_status: item.completion_status,
  };
}

async function loadActiveBoq(projectId: string) {
  const listed = await getProjectBoqs(
    projectId,
    { status: "active" },
    parsePagination({ page_size: "5" }),
  );

  if (listed.error === "not_found") {
    return { error: "not_found" as const, boq: null };
  }

  if (listed.error || !listed.result) {
    return { error: listed.error ?? "Unable to load BOQ.", boq: null };
  }

  const active = listed.result.boqs[0];

  if (!active) {
    const anyBoq = await getProjectBoqs(
      projectId,
      { status: "all" },
      parsePagination({ page_size: "5" }),
    );
    const fallback = anyBoq.result?.boqs.find(
      (boq) => boq.status !== "archived",
    );

    if (!fallback) {
      return { error: null, boq: null, dashboard: listed.result.dashboard };
    }

    const detail = await getBoqById(projectId, fallback.id);
    return {
      error: detail.error,
      boq: detail.boq,
      dashboard: anyBoq.result?.dashboard ?? listed.result.dashboard,
    };
  }

  const detail = await getBoqById(projectId, active.id);
  return {
    error: detail.error,
    boq: detail.boq,
    dashboard: listed.result.dashboard,
  };
}

export async function getProjectSummaryTool(
  projectId: string,
): Promise<AIToolResult<AIProjectOverview>> {
  const result = await getProjectById(projectId);

  if (result.error === "not_found" || !result.project) {
    return {
      ok: false,
      tool: "getProjectSummary",
      error: result.error === "not_found" ? "not_found" : "failed",
      message:
        result.error === "not_found"
          ? "You don't have access to this project."
          : (result.error ?? "Unable to load this project."),
    };
  }

  const project = result.project;

  return {
    ok: true,
    tool: "getProjectSummary",
    source: { label: "Project record" },
    data: {
      name: project.name,
      status: PROJECT_STATUS_LABELS[project.status] ?? project.status,
      location: project.location,
      client_name: project.client_name,
      start_date: project.start_date,
      expected_end_date: project.expected_end_date,
      estimated_budget: project.estimated_budget,
      archived: Boolean(project.archived_at),
    },
  };
}

export async function getBOQProgressTool(
  projectId: string,
  workQuery?: string,
): Promise<AIToolResult<AIBOQSnapshot>> {
  const access = await requireProject(projectId);

  if (!access.ok) {
    return {
      ok: false,
      tool: "getBOQProgress",
      error: access.error === "not_found" ? "not_found" : "failed",
      message: access.message,
    };
  }

  const loaded = await loadActiveBoq(projectId);

  if (loaded.error === "not_found") {
    return {
      ok: false,
      tool: "getBOQProgress",
      error: "not_found",
      message: "You don't have access to this project.",
    };
  }

  if (!loaded.boq) {
    return {
      ok: false,
      tool: "getBOQProgress",
      error: "missing_data",
      message:
        "I can't calculate BOQ progress because this project doesn't have a BOQ yet.",
    };
  }

  const allItems = [...loaded.boq.items, ...loaded.boq.unsectioned_items];
  const query = workQuery?.trim().toLowerCase();
  const items = query
    ? allItems.filter((item) => {
        const haystack = `${item.description} ${item.section_name ?? ""} ${item.item_code ?? ""}`.toLowerCase();
        return haystack.includes(query);
      })
    : allItems.slice(0, 20);

  if (query && items.length === 0) {
    return {
      ok: false,
      tool: "getBOQProgress",
      error: "missing_data",
      message: `I couldn't find BOQ items matching "${workQuery}" on this project.`,
    };
  }

  return {
    ok: true,
    tool: "getBOQProgress",
    source: {
      label: "Active BOQ",
      count: items.length,
    },
    data: {
      name: loaded.boq.name,
      status: loaded.boq.status,
      item_count: loaded.boq.summary.item_count,
      estimated_value: loaded.boq.summary.estimated_value,
      completed_value: loaded.boq.summary.completed_value,
      remaining_value: loaded.boq.summary.remaining_value,
      completion_percentage: loaded.boq.summary.completion_percentage,
      remaining_sections: loaded.boq.sections
        .filter((section) => Number(section.remaining_value) > 0)
        .slice(0, 8)
        .map((section) => ({
          name: section.name,
          remaining_value: section.remaining_value,
          completion_percentage: section.completion_percentage,
        })),
      items: items.slice(0, 20).map(mapBOQItem),
    },
  };
}

export async function getBOQRemainingWorkTool(
  projectId: string,
  workQuery?: string,
): Promise<AIToolResult<AIBOQItemSnapshot[]>> {
  const progress = await getBOQProgressTool(projectId, workQuery);

  if (!progress.ok) {
    return {
      ok: false,
      tool: "getBOQRemainingWork",
      error: progress.error,
      message: progress.message,
    };
  }

  const remaining = progress.data.items.filter(
    (item) => item.completion_status !== "completed",
  );

  if (remaining.length === 0) {
    return {
      ok: false,
      tool: "getBOQRemainingWork",
      error: "missing_data",
      message: workQuery
        ? `No remaining ${workQuery} work is recorded on the active BOQ.`
        : "No incomplete BOQ items are recorded on the active BOQ.",
    };
  }

  return {
    ok: true,
    tool: "getBOQRemainingWork",
    source: { label: "Active BOQ remaining items", count: remaining.length },
    data: remaining.slice(0, 20),
  };
}

export async function getRecentSiteReportsTool(
  projectId: string,
  from: string,
  to: string,
): Promise<AIToolResult<AISiteReportSnapshot[]>> {
  const result = await getDailyReports(
    projectId,
    { from, to },
    parsePagination({ page_size: "10" }),
  );

  if (result.error === "not_found") {
    return {
      ok: false,
      tool: "getRecentSiteReports",
      error: "not_found",
      message: "You don't have access to this project.",
    };
  }

  if (result.error) {
    return {
      ok: false,
      tool: "getRecentSiteReports",
      error: "failed",
      message: result.error,
    };
  }

  if (result.reports.length === 0) {
    return {
      ok: false,
      tool: "getRecentSiteReports",
      error: "missing_data",
      message: "There are no site reports recorded for this period.",
    };
  }

  return {
    ok: true,
    tool: "getRecentSiteReports",
    source: { label: "Daily site reports", count: result.reports.length },
    data: result.reports.map((report) => ({
      report_date: report.report_date,
      weather: report.weather,
      work_completed: report.work_completed,
      issues: report.issues,
      tomorrow_plan: report.tomorrow_plan,
      general_notes: report.general_notes,
      worker_count: report.worker_count,
    })),
  };
}

export async function getSiteIssuesTool(
  projectId: string,
  from: string,
  to: string,
): Promise<AIToolResult<AISiteReportSnapshot[]>> {
  const reports = await getRecentSiteReportsTool(projectId, from, to);

  if (!reports.ok) {
    return {
      ok: false,
      tool: "getSiteIssues",
      error: reports.error,
      message: reports.message,
    };
  }

  const issues = reports.data.filter((report) => report.issues?.trim());

  if (issues.length === 0) {
    return {
      ok: false,
      tool: "getSiteIssues",
      error: "missing_data",
      message: "No site issues were reported for this period.",
    };
  }

  return {
    ok: true,
    tool: "getSiteIssues",
    source: { label: "Site issues from daily reports", count: issues.length },
    data: issues,
  };
}

export async function getLabourSummaryTool(
  projectId: string,
  from: string,
  to: string,
): Promise<AIToolResult<AILabourSnapshot>> {
  const [summary, dayStats] = await Promise.all([
    getLabourSummary(projectId, from, to),
    from === to ? getLabourTodayStats(projectId, from) : Promise.resolve(null),
  ]);

  if (summary.error === "not_found") {
    return {
      ok: false,
      tool: "getLabourSummary",
      error: "not_found",
      message: "You don't have access to this project.",
    };
  }

  if (summary.error || !summary.summary) {
    return {
      ok: false,
      tool: "getLabourSummary",
      error: "failed",
      message: summary.error ?? "Unable to load labour data.",
    };
  }

  if (summary.summary.days_recorded === 0) {
    return {
      ok: false,
      tool: "getLabourSummary",
      error: "missing_data",
      message: "I don't have enough labour attendance data for that period.",
    };
  }

  return {
    ok: true,
    tool: "getLabourSummary",
    source: {
      label: `Labour attendance ${from} to ${to}`,
      count: summary.summary.days_recorded,
    },
    data: {
      from: summary.summary.from,
      to: summary.summary.to,
      total_labour_days: summary.summary.total_labour_days,
      total_labour_cost: summary.summary.total_labour_cost,
      average_workers_per_day: summary.summary.average_workers_per_day,
      present_days: summary.summary.present_days,
      half_day_days: summary.summary.half_day_days,
      days_recorded: summary.summary.days_recorded,
      top_roles: summary.summary.top_roles.slice(0, 6).map((role) => ({
        role: role.label,
        labour_days: role.labour_days,
        labour_cost: role.labour_cost,
      })),
      day_stats:
        dayStats && !dayStats.error
          ? {
              date: dayStats.stats.date,
              present: dayStats.stats.present,
              half_day: dayStats.stats.half_day,
              absent: dayStats.stats.absent,
              unmarked: dayStats.stats.unmarked,
              labour_cost: dayStats.stats.labour_cost,
            }
          : undefined,
    },
  };
}

export async function getMaterialSummaryTool(
  projectId: string,
  from: string,
  to: string,
): Promise<AIToolResult<AIMaterialSnapshot>> {
  const dashboard = await getProjectMaterialsDashboard(projectId, { from, to });

  if (dashboard.error === "not_found") {
    return {
      ok: false,
      tool: "getMaterialSummary",
      error: "not_found",
      message: "You don't have access to this project.",
    };
  }

  if (dashboard.error || !dashboard.dashboard) {
    return {
      ok: false,
      tool: "getMaterialSummary",
      error: "failed",
      message: dashboard.error ?? "Unable to load materials.",
    };
  }

  const data = dashboard.dashboard;
  const transactions = data.recent_transactions.filter((row) => {
    return row.transaction_date >= from && row.transaction_date <= to;
  });

  if (
    data.cost.total_purchases === 0 &&
    transactions.length === 0 &&
    data.assigned.length === 0
  ) {
    return {
      ok: false,
      tool: "getMaterialSummary",
      error: "missing_data",
      message: "I don't have enough material transaction data to answer that.",
    };
  }

  return {
    ok: true,
    tool: "getMaterialSummary",
    source: {
      label: "Material transactions",
      count: transactions.length || data.assigned.length,
    },
    data: {
      from: data.cost.from,
      to: data.cost.to,
      total_material_cost: data.cost.total_material_cost,
      total_used_cost: data.cost.total_used_cost,
      stock_value: data.totals.stock_value,
      low_stock: data.totals.low_stock,
      out_of_stock: data.totals.out_of_stock,
      materials_in_use: data.totals.materials_in_use,
      stock_available: data.assigned.length > 0,
      top_used: data.cost.most_purchased.slice(0, 8).map((item) => ({
        name: item.name,
        quantity: item.quantity,
        total_cost: item.total_cost,
      })),
      recent_transactions: transactions.slice(0, 12).map((row) => ({
        date: row.transaction_date,
        type: row.transaction_type,
        material: row.material_name,
        quantity: row.quantity,
        total_cost: row.total_cost,
      })),
    },
  };
}

export async function getMaterialStockTool(
  projectId: string,
): Promise<AIToolResult<AIStockSnapshot>> {
  const dashboard = await getProjectMaterialsDashboard(projectId);

  if (dashboard.error === "not_found") {
    return {
      ok: false,
      tool: "getMaterialStock",
      error: "not_found",
      message: "You don't have access to this project.",
    };
  }

  if (dashboard.error || !dashboard.dashboard) {
    return {
      ok: false,
      tool: "getMaterialStock",
      error: "failed",
      message: dashboard.error ?? "Unable to load stock.",
    };
  }

  if (dashboard.dashboard.assigned.length === 0) {
    return {
      ok: false,
      tool: "getMaterialStock",
      error: "missing_data",
      message: "BuildPilot does not have enough stock data to answer that.",
    };
  }

  const low = dashboard.dashboard.assigned.filter(
    (row) => row.stock_status === "low_stock",
  );
  const empty = dashboard.dashboard.assigned.filter(
    (row) => row.stock_status === "out_of_stock",
  );

  return {
    ok: true,
    tool: "getMaterialStock",
    source: {
      label: "Project material stock",
      count: dashboard.dashboard.assigned.length,
    },
    data: {
      stock_available: true,
      low_stock: low.slice(0, 12).map((row) => ({
        name: row.material.name,
        current_stock: row.current_stock,
        status: row.stock_status,
      })),
      out_of_stock: empty.slice(0, 12).map((row) => ({
        name: row.material.name,
        current_stock: row.current_stock,
      })),
    },
  };
}

export async function getExpenseSummaryTool(
  projectId: string,
  from: string,
  to: string,
): Promise<AIToolResult<AIExpenseSnapshot>> {
  const [stats, list, categories] = await Promise.all([
    getProjectExpenseStats(projectId),
    getProjectExpenses(
      projectId,
      { from, to, status: "active" },
      parsePagination({ page_size: "10" }),
    ),
    getExpenseCategoryTotals(projectId, { from, to }),
  ]);

  if (stats.error === "not_found" || list.error === "not_found") {
    return {
      ok: false,
      tool: "getExpenseSummary",
      error: "not_found",
      message: "You don't have access to this project.",
    };
  }

  if (stats.error || !stats.stats) {
    return {
      ok: false,
      tool: "getExpenseSummary",
      error: "failed",
      message: stats.error ?? "Unable to load expenses.",
    };
  }

  if (stats.stats.active_count === 0 && (list.result?.expenses.length ?? 0) === 0) {
    return {
      ok: false,
      tool: "getExpenseSummary",
      error: "missing_data",
      message: "No expenses are recorded for this project.",
    };
  }

  return {
    ok: true,
    tool: "getExpenseSummary",
    source: { label: "Project expenses", count: stats.stats.active_count },
    data: {
      total_amount: stats.stats.total_amount,
      this_month_amount: stats.stats.this_month_amount,
      today_amount: stats.stats.today_amount,
      active_count: stats.stats.active_count,
      categories: (categories.categories ?? []).slice(0, 8).map((row) => ({
        label: row.label,
        amount: row.amount,
        count: row.count,
      })),
      largest: (list.result?.expenses ?? []).slice(0, 8).map((row) => ({
        date: row.expense_date,
        description: row.description,
        category: row.category,
        amount: row.amount,
      })),
    },
  };
}

export async function getProjectCostTool(
  projectId: string,
  from?: string,
  to?: string,
): Promise<AIToolResult<AIProjectCostSnapshot>> {
  const dashboard = await getProjectCostDashboard(
    projectId,
    from && to ? { from, to } : undefined,
  );

  if (dashboard.error === "not_found") {
    return {
      ok: false,
      tool: "getProjectCost",
      error: "not_found",
      message: "You don't have access to this project.",
    };
  }

  if (dashboard.error || !dashboard.dashboard) {
    return {
      ok: false,
      tool: "getProjectCost",
      error: "failed",
      message: dashboard.error ?? "Unable to load project cost.",
    };
  }

  const totals = dashboard.dashboard.totals;

  if (
    totals.labour_records === 0 &&
    totals.material_records === 0 &&
    totals.expense_records === 0
  ) {
    return {
      ok: false,
      tool: "getProjectCost",
      error: "missing_data",
      message: "I don't have enough cost data to calculate this project's actual cost yet.",
    };
  }

  return {
    ok: true,
    tool: "getProjectCost",
    source: {
      label: "Project actual cost",
      count:
        totals.labour_records + totals.material_records + totals.expense_records,
    },
    data: {
      labour_cost: totals.labour_cost,
      material_cost: totals.material_cost,
      other_expenses: totals.other_expenses,
      total_cost: totals.total_cost,
      labour_records: totals.labour_records,
      material_records: totals.material_records,
      expense_records: totals.expense_records,
      estimated_budget: dashboard.dashboard.budget.estimated_budget,
      remaining_budget: dashboard.dashboard.budget.remaining_budget,
      budget_used_percent: dashboard.dashboard.budget.budget_used_percent,
      budget_status: dashboard.dashboard.budget.status,
    },
  };
}

export async function getQuotationSummaryTool(
  projectId: string,
): Promise<AIToolResult<AIQuotationSnapshot>> {
  const result = await getProjectQuotationSummary(projectId);

  if (result.error === "not_found") {
    return {
      ok: false,
      tool: "getQuotationSummary",
      error: "not_found",
      message: "You don't have access to this project.",
    };
  }

  if (result.error) {
    return {
      ok: false,
      tool: "getQuotationSummary",
      error: "failed",
      message: result.error,
    };
  }

  if (!result.quotation) {
    return {
      ok: false,
      tool: "getQuotationSummary",
      error: "missing_data",
      message: "This project does not have an accepted quotation.",
    };
  }

  return {
    ok: true,
    tool: "getQuotationSummary",
    source: { label: "Accepted quotation" },
    data: {
      quotation_number: result.quotation.quotation_number,
      title: result.quotation.title,
      status: result.quotation.effective_status,
      total_amount: result.quotation.total_amount,
    },
  };
}

export async function getEstimateVsActualTool(
  projectId: string,
): Promise<AIToolResult<AIEstimateVsActualSnapshot>> {
  const [quotation, cost] = await Promise.all([
    getProjectQuotationSummary(projectId),
    getProjectCostTool(projectId),
  ]);

  if (quotation.error === "not_found" || (!cost.ok && cost.error === "not_found")) {
    return {
      ok: false,
      tool: "getEstimateVsActual",
      error: "not_found",
      message: "You don't have access to this project.",
    };
  }

  if (quotation.estimate_vs_actual && quotation.quotation) {
    const total = quotation.estimate_vs_actual.total;
    return {
      ok: true,
      tool: "getEstimateVsActual",
      source: { label: "Quotation vs actual cost" },
      data: {
        estimated_total: total.estimated,
        actual_total: total.actual,
        difference: total.difference,
        variance_percentage: total.variance_percentage,
        over_estimate: total.over_estimate,
        labour: quotation.estimate_vs_actual.labour,
        materials: quotation.estimate_vs_actual.materials,
        other: quotation.estimate_vs_actual.other,
        source: "quotation",
      },
    };
  }

  if (!cost.ok) {
    return {
      ok: false,
      tool: "getEstimateVsActual",
      error: "missing_data",
      message:
        "I can't compare estimate vs actual because this project does not have an accepted quotation or enough cost data.",
    };
  }

  return {
    ok: true,
    tool: "getEstimateVsActual",
    source: { label: "Budget vs actual cost" },
    data: {
      estimated_total: cost.data.estimated_budget,
      actual_total: cost.data.total_cost,
      difference: null,
      variance_percentage: cost.data.budget_used_percent,
      over_estimate: cost.data.budget_status === "over_budget",
      source: cost.data.estimated_budget ? "budget" : "none",
    },
  };
}

export async function getRecentMeasurementsTool(
  projectId: string,
  from: string,
  to: string,
): Promise<AIToolResult<AIMeasurementSnapshot[]>> {
  const access = await requireProject(projectId);

  if (!access.ok) {
    return {
      ok: false,
      tool: "getRecentMeasurements",
      error: access.error === "not_found" ? "not_found" : "failed",
      message: access.message,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boq_measurements")
    .select("measurement_date, quantity, location, boq_item_id, unit")
    .eq("project_id", access.projectId)
    .eq("business_id", access.businessId)
    .eq("status", "active")
    .gte("measurement_date", from)
    .lte("measurement_date", to)
    .order("measurement_date", { ascending: false })
    .limit(20);

  if (error) {
    return {
      ok: false,
      tool: "getRecentMeasurements",
      error: "failed",
      message: "Unable to load measurements.",
    };
  }

  const rows = data ?? [];

  if (rows.length === 0) {
    return {
      ok: false,
      tool: "getRecentMeasurements",
      error: "missing_data",
      message: "There are no active measurements recorded for this period.",
    };
  }

  const itemIds = [...new Set(rows.map((row) => row.boq_item_id))];
  const { data: items } = await supabase
    .from("boq_items")
    .select("id, description, unit")
    .eq("business_id", access.businessId)
    .in("id", itemIds);

  const itemMap = new Map(
    (items ?? []).map((item) => [item.id, item]),
  );

  return {
    ok: true,
    tool: "getRecentMeasurements",
    source: { label: "Active BOQ measurements", count: rows.length },
    data: rows.map((row) => ({
      date: row.measurement_date,
      item: itemMap.get(row.boq_item_id)?.description ?? "BOQ item",
      quantity: row.quantity,
      unit: itemMap.get(row.boq_item_id)?.unit ?? row.unit,
      location: row.location,
    })),
  };
}

export async function getProjectPhotosMetadataTool(
  projectId: string,
): Promise<AIToolResult<AIPhotoMetadataSnapshot[]>> {
  const access = await requireProject(projectId);

  if (!access.ok) {
    return {
      ok: false,
      tool: "getProjectPhotosMetadata",
      error: access.error === "not_found" ? "not_found" : "failed",
      message: access.message,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_photos")
    .select("file_name, caption, created_at")
    .eq("project_id", access.projectId)
    .eq("business_id", access.businessId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    return {
      ok: false,
      tool: "getProjectPhotosMetadata",
      error: "failed",
      message: "Unable to load photo metadata.",
    };
  }

  const rows = data ?? [];

  if (rows.length === 0) {
    return {
      ok: false,
      tool: "getProjectPhotosMetadata",
      error: "missing_data",
      message: "There are no site photos recorded for this project.",
    };
  }

  return {
    ok: true,
    tool: "getProjectPhotosMetadata",
    source: { label: "Site photo metadata", count: rows.length },
    data: rows.map((row) => ({
      file_name: row.file_name,
      caption: row.caption,
      created_at: row.created_at,
    })),
  };
}

export async function getActiveProjectsTool(): Promise<
  AIToolResult<AIActiveProjectSnapshot[]>
> {
  const [{ projects, error }, costs, recentReports] = await Promise.all([
    getProjects({ status: "active" }, parsePagination({ page_size: "20" })),
    getRecentProjectCostOverviews(20),
    getRecentDailyReports(8),
  ]);

  if (error) {
    return {
      ok: false,
      tool: "getActiveProjects",
      error: "failed",
      message: error,
    };
  }

  if (projects.length === 0) {
    return {
      ok: false,
      tool: "getActiveProjects",
      error: "missing_data",
      message: "There are no active projects in this workspace.",
    };
  }

  const costMap = new Map(
    (costs.projects ?? []).map((row) => [row.project_id, row]),
  );
  const issueMap = new Map<string, string>();

  for (const report of recentReports.reports) {
    if (report.issues && report.project_name && !issueMap.has(report.project_name)) {
      issueMap.set(report.project_name, report.issues);
    }
  }

  return {
    ok: true,
    tool: "getActiveProjects",
    source: { label: "Active projects", count: projects.length },
    data: projects.map((project) => {
      const cost = costMap.get(project.id);
      return {
        name: project.name,
        status: PROJECT_STATUS_LABELS[project.status] ?? project.status,
        location: project.location,
        actual_cost: cost?.actual_cost ?? null,
        estimated_budget: cost?.estimated_budget ?? project.estimated_budget,
        budget_status: cost?.status ?? null,
        latest_issue: issueMap.get(project.name) ?? null,
      };
    }),
  };
}

