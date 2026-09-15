import { cache } from "react";
import { EXPENSE_CATEGORY_LABELS } from "@/constants/expense";
import {
  buildBudgetSummary,
  buildCostBreakdown,
  buildMonthlySummary,
  buildProjectCostTotals,
  moneyToPaise,
} from "@/lib/costs/calculations";
import type {
  ExpenseCategoryTotal,
  MonthlyCostSummary,
  ProjectCostDashboard,
  ProjectCostOverview,
  ProjectCostTotals,
} from "@/lib/costs/types";
import { getExpenseErrorMessage } from "@/lib/expenses/helpers";
import {
  endOfMonthIso,
  formatPaise,
  isIsoDate,
  monthsAgoStartIso,
  startOfMonthIso,
  startOfPreviousMonthIso,
  todayIsoDate,
} from "@/lib/labour/money";
import { getProjectById, getRecentProjects } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import type { ExpenseCategory } from "@/types";

type CostTotalsRow = {
  labour_cost: number | string;
  material_cost: number | string;
  expense_cost: number | string;
  labour_records: number | string;
  material_records: number | string;
  expense_records: number | string;
};

type MonthlyRow = {
  month_start: string;
  labour_cost: number | string;
  material_cost: number | string;
  expense_cost: number | string;
};

type CategoryRow = {
  category: ExpenseCategory;
  total_amount: number | string;
  expense_count: number | string;
};

function toCount(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function totalsFromRow(row: CostTotalsRow | null): ProjectCostTotals {
  return buildProjectCostTotals({
    labour: row?.labour_cost ?? 0,
    material: row?.material_cost ?? 0,
    expense: row?.expense_cost ?? 0,
    labourRecords: toCount(row?.labour_records),
    materialRecords: toCount(row?.material_records),
    expenseRecords: toCount(row?.expense_records),
  });
}

function parseRange(from?: string, to?: string): {
  from: string | null;
  to: string | null;
  error?: string;
} {
  const rangeFrom = from && isIsoDate(from) ? from : null;
  const rangeTo = to && isIsoDate(to) ? to : null;

  if ((from && !rangeFrom) || (to && !rangeTo)) {
    return { from: null, to: null, error: "Enter a valid date range." };
  }

  if (rangeFrom && rangeTo && rangeTo < rangeFrom) {
    return {
      from: rangeFrom,
      to: rangeTo,
      error: "End date must be on or after the start date.",
    };
  }

  return { from: rangeFrom, to: rangeTo };
}

export function currentMonthRange(today = todayIsoDate()): {
  from: string;
  to: string;
} {
  return { from: startOfMonthIso(today), to: today };
}

export function previousMonthRange(today = todayIsoDate()): {
  from: string;
  to: string;
} {
  const from = startOfPreviousMonthIso(today);
  return { from, to: endOfMonthIso(from) };
}

export function lastSixMonthsRange(today = todayIsoDate()): {
  from: string;
  to: string;
} {
  return { from: monthsAgoStartIso(today, 5), to: today };
}

export async function getProjectLabourCost(
  projectId: string,
  range?: { from?: string; to?: string },
): Promise<
  | { cost: string; records: number; error: null }
  | { cost: null; records: 0; error: "not_found" }
  | { cost: null; records: 0; error: string }
> {
  const result = await getProjectCostTotals(projectId, range);

  if (result.error || !result.totals) {
    return {
      cost: null,
      records: 0,
      error: result.error ?? "Unable to load labour cost.",
    };
  }

  return {
    cost: result.totals.labour_cost,
    records: result.totals.labour_records,
    error: null,
  };
}

export async function getProjectMaterialCost(
  projectId: string,
  range?: { from?: string; to?: string },
): Promise<
  | { cost: string; records: number; error: null }
  | { cost: null; records: 0; error: "not_found" }
  | { cost: null; records: 0; error: string }
> {
  const result = await getProjectCostTotals(projectId, range);

  if (result.error || !result.totals) {
    return {
      cost: null,
      records: 0,
      error: result.error ?? "Unable to load material cost.",
    };
  }

  return {
    cost: result.totals.material_cost,
    records: result.totals.material_records,
    error: null,
  };
}

export async function getProjectExpenseCost(
  projectId: string,
  range?: { from?: string; to?: string },
): Promise<
  | { cost: string; records: number; error: null }
  | { cost: null; records: 0; error: "not_found" }
  | { cost: null; records: 0; error: string }
> {
  const result = await getProjectCostTotals(projectId, range);

  if (result.error || !result.totals) {
    return {
      cost: null,
      records: 0,
      error: result.error ?? "Unable to load expense cost.",
    };
  }

  return {
    cost: result.totals.other_expenses,
    records: result.totals.expense_records,
    error: null,
  };
}

export async function getProjectTotalCost(
  projectId: string,
  range?: { from?: string; to?: string },
): Promise<
  | { cost: string; totals: ProjectCostTotals; error: null }
  | { cost: null; totals: null; error: "not_found" }
  | { cost: null; totals: null; error: string }
> {
  const result = await getProjectCostTotals(projectId, range);

  if (result.error || !result.totals) {
    return {
      cost: null,
      totals: null,
      error: result.error ?? "Unable to load project cost.",
    };
  }

  return {
    cost: result.totals.total_cost,
    totals: result.totals,
    error: null,
  };
}

export async function getProjectBudgetSummary(
  projectId: string,
): Promise<
  | { budget: ReturnType<typeof buildBudgetSummary>; error: null }
  | { budget: null; error: "not_found" }
  | { budget: null; error: string }
> {
  const dashboard = await getProjectCostDashboard(projectId);

  if (dashboard.error || !dashboard.dashboard) {
    return {
      budget: null,
      error: dashboard.error ?? "Unable to load budget summary.",
    };
  }

  return { budget: dashboard.dashboard.budget, error: null };
}

export const getProjectCostTotals = cache(async function getProjectCostTotals(
  projectId: string,
  range?: { from?: string; to?: string },
): Promise<
  | { totals: ProjectCostTotals; error: null }
  | { totals: null; error: "not_found" }
  | { totals: null; error: string }
> {
  const parsed = parseRange(range?.from, range?.to);

  if (parsed.error) {
    return { totals: null, error: parsed.error };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      totals: null,
      error:
        projectResult.error === "not_found" ? "not_found" : projectResult.error,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("project_cost_totals", {
    target_project_id: projectId,
    range_from: parsed.from,
    range_to: parsed.to,
  });

  if (error) {
    return { totals: null, error: getExpenseErrorMessage(error) };
  }

  return {
    totals: totalsFromRow((data?.[0] as CostTotalsRow | undefined) ?? null),
    error: null,
  };
});

export async function getMonthlyProjectCosts(
  projectId: string,
  from: string,
  to: string,
): Promise<
  | { months: MonthlyCostSummary[]; error: null }
  | { months: []; error: "not_found" }
  | { months: []; error: string }
> {
  const parsed = parseRange(from, to);

  if (parsed.error || !parsed.from || !parsed.to) {
    return {
      months: [],
      error: parsed.error ?? "Enter a valid date range.",
    };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      months: [],
      error:
        projectResult.error === "not_found" ? "not_found" : projectResult.error,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("project_monthly_costs", {
    target_project_id: projectId,
    range_from: parsed.from,
    range_to: parsed.to,
  });

  if (error) {
    return { months: [], error: getExpenseErrorMessage(error) };
  }

  return {
    months: ((data ?? []) as MonthlyRow[]).map((row) =>
      buildMonthlySummary(
        row.month_start,
        row.labour_cost,
        row.material_cost,
        row.expense_cost,
      ),
    ),
    error: null,
  };
}

export async function getExpenseCategoryTotals(
  projectId: string,
  range?: { from?: string; to?: string },
): Promise<
  | { categories: ExpenseCategoryTotal[]; error: null }
  | { categories: []; error: "not_found" }
  | { categories: []; error: string }
> {
  const parsed = parseRange(range?.from, range?.to);

  if (parsed.error) {
    return { categories: [], error: parsed.error };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      categories: [],
      error:
        projectResult.error === "not_found" ? "not_found" : projectResult.error,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("project_expense_category_totals", {
    target_project_id: projectId,
    range_from: parsed.from,
    range_to: parsed.to,
  });

  if (error) {
    return { categories: [], error: getExpenseErrorMessage(error) };
  }

  return {
    categories: ((data ?? []) as CategoryRow[]).map((row) => ({
      category: row.category,
      label: EXPENSE_CATEGORY_LABELS[row.category],
      amount: formatPaise(moneyToPaise(row.total_amount)),
      count: toCount(row.expense_count),
    })),
    error: null,
  };
}

export const getProjectCostDashboard = cache(
  async function getProjectCostDashboard(
    projectId: string,
    options: { from?: string; to?: string } = {},
  ): Promise<
    | { dashboard: ProjectCostDashboard; error: null }
    | { dashboard: null; error: "not_found" }
    | { dashboard: null; error: string }
  > {
    const today = todayIsoDate();
    const month =
      options.from && options.to
        ? { from: options.from, to: options.to }
        : currentMonthRange(today);
    const trendRange = lastSixMonthsRange(today);

    const [projectResult, allTime, monthly, trend, categories] =
      await Promise.all([
        getProjectById(projectId),
        getProjectCostTotals(projectId),
        getProjectCostTotals(projectId, month),
        getMonthlyProjectCosts(projectId, trendRange.from, trendRange.to),
        getExpenseCategoryTotals(projectId, month),
      ]);

    if (projectResult.error === "not_found" || !projectResult.project) {
      return {
        dashboard: null,
        error:
          projectResult.error === "not_found"
            ? "not_found"
            : projectResult.error,
      };
    }

    if (allTime.error === "not_found" || monthly.error === "not_found") {
      return { dashboard: null, error: "not_found" };
    }

    if (allTime.error || !allTime.totals) {
      return { dashboard: null, error: allTime.error };
    }

    if (monthly.error || !monthly.totals) {
      return { dashboard: null, error: monthly.error };
    }

    if (trend.error === "not_found" || categories.error === "not_found") {
      return { dashboard: null, error: "not_found" };
    }

    if (trend.error) {
      return { dashboard: null, error: trend.error };
    }

    if (categories.error) {
      return { dashboard: null, error: categories.error };
    }

    return {
      dashboard: {
        totals: allTime.totals,
        budget: buildBudgetSummary(
          projectResult.project.estimated_budget,
          allTime.totals.total_cost,
        ),
        breakdown: buildCostBreakdown(allTime.totals),
        monthly: {
          month_start: startOfMonthIso(month.from),
          labour_cost: monthly.totals.labour_cost,
          material_cost: monthly.totals.material_cost,
          other_expenses: monthly.totals.other_expenses,
          total_cost: monthly.totals.total_cost,
        },
        trend: trend.months,
        categories: categories.categories,
      },
      error: null,
    };
  },
);

export async function getRecentProjectCostOverviews(
  limit = 5,
): Promise<{
  projects: ProjectCostOverview[];
  error: string | null;
}> {
  const { projects, error } = await getRecentProjects(limit);

  if (error) {
    return { projects: [], error };
  }

  if (projects.length === 0) {
    return { projects: [], error: null };
  }

  const supabase = await createClient();
  const { data, error: costError } = await supabase.rpc(
    "projects_cost_totals",
    { target_project_ids: projects.map((project) => project.id) },
  );

  if (costError) {
    return { projects: [], error: getExpenseErrorMessage(costError) };
  }

  const costs = new Map(
    ((data ?? []) as Array<{
      project_id: string;
      labour_cost: number | string;
      material_cost: number | string;
      expense_cost: number | string;
    }>).map((row) => [
      row.project_id,
      buildProjectCostTotals({
        labour: row.labour_cost,
        material: row.material_cost,
        expense: row.expense_cost,
        labourRecords: 0,
        materialRecords: 0,
        expenseRecords: 0,
      }),
    ]),
  );

  return {
    projects: projects.map((project) => {
      const totals = costs.get(project.id) ??
        buildProjectCostTotals({
          labour: 0,
          material: 0,
          expense: 0,
          labourRecords: 0,
          materialRecords: 0,
          expenseRecords: 0,
        });
      const budget = buildBudgetSummary(
        project.estimated_budget,
        totals.total_cost,
      );

      return {
        project_id: project.id,
        project_name: project.name,
        estimated_budget: budget.estimated_budget,
        actual_cost: budget.actual_cost,
        remaining_budget: budget.remaining_budget,
        budget_used_percent: budget.budget_used_percent,
        status: budget.status,
        labour_cost: totals.labour_cost,
        material_cost: totals.material_cost,
        other_expenses: totals.other_expenses,
      };
    }),
    error: null,
  };
}
