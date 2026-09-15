import { formatLabourCost } from "@/lib/labour/money";
import type {
  AIBOQSnapshot,
  AIContextPayload,
  AIExpenseSnapshot,
  AILabourSnapshot,
  AIMaterialSnapshot,
  AIProjectCostSnapshot,
  ClientUpdateDraft,
  DailyReportDraft,
} from "@/lib/ai/types";

function money(value: string | null | undefined): string {
  if (!value) {
    return "Not recorded";
  }

  return formatLabourCost(value);
}

export function formatMissing(message: string): string {
  return `${message}\n\nBased on BuildPilot project data.`;
}

export function formatProjectCost(cost: AIProjectCostSnapshot): string {
  return [
    "## Project cost",
    "",
    `| Category | Amount |`,
    `| --- | --- |`,
    `| Labour | ${money(cost.labour_cost)} |`,
    `| Materials | ${money(cost.material_cost)} |`,
    `| Other expenses | ${money(cost.other_expenses)} |`,
    `| **Actual cost** | **${money(cost.total_cost)}** |`,
    "",
    cost.estimated_budget
      ? `Estimated budget: ${money(cost.estimated_budget)}`
      : "No estimated budget is recorded.",
    cost.budget_used_percent != null
      ? `Budget used: ${cost.budget_used_percent}%`
      : "",
    `Budget status: ${cost.budget_status.replaceAll("_", " ")}`,
    "",
    "Based on BuildPilot project data.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function formatBOQ(boq: AIBOQSnapshot, workQuery?: string): string {
  const heading = workQuery ? `${workQuery} progress` : "BOQ progress";
  const rows = boq.items.slice(0, 12).map((item) => {
    const percent =
      item.completion_percentage == null
        ? "—"
        : `${item.completion_percentage}%`;
    return `| ${item.description} | ${item.estimated_quantity} ${item.unit} | ${item.completed_quantity} | ${item.remaining_quantity} | ${percent} |`;
  });

  return [
    `## ${heading}`,
    "",
    `BOQ: ${boq.name} (${boq.status})`,
    `Estimated: ${money(boq.estimated_value)}`,
    `Completed value: ${money(boq.completed_value)}`,
    `Remaining value: ${money(boq.remaining_value)}`,
    boq.completion_percentage == null
      ? "Progress: not enough BOQ data to calculate a percentage."
      : `Progress: ${boq.completion_percentage}%`,
    "",
    rows.length
      ? [
          "| Item | Estimated | Completed | Remaining | Progress |",
          "| --- | --- | --- | --- | --- |",
          ...rows,
        ].join("\n")
      : "No matching BOQ items were found.",
    "",
    "Based on active BOQ data in BuildPilot.",
  ].join("\n");
}

export function formatLabour(labour: AILabourSnapshot): string {
  const roles = labour.top_roles
    .slice(0, 6)
    .map(
      (role) =>
        `- ${role.role}: ${role.labour_days} labour days, ${money(role.labour_cost)}`,
    );

  return [
    "## Labour summary",
    "",
    `Period: ${labour.from} to ${labour.to}`,
    `Labour cost: ${money(labour.total_labour_cost)}`,
    `Labour days: ${labour.total_labour_days}`,
    `Average workers per day: ${labour.average_workers_per_day}`,
    labour.day_stats
      ? `Workers recorded on ${labour.day_stats.date}: ${labour.day_stats.present} present, ${labour.day_stats.half_day} half day, ${labour.day_stats.absent} absent.`
      : "",
    "",
    roles.length ? roles.join("\n") : "No role breakdown is available.",
    "",
    "Based on labour attendance records in BuildPilot.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function formatMaterials(materials: AIMaterialSnapshot): string {
  const used = materials.top_used
    .slice(0, 8)
    .map(
      (item) =>
        `- ${item.name}: ${item.quantity} used, ${money(item.total_cost)}`,
    );

  return [
    "## Materials",
    "",
    `Period: ${materials.from} to ${materials.to}`,
    `Material cost: ${money(materials.total_material_cost)}`,
    `Used cost: ${money(materials.total_used_cost)}`,
    materials.stock_available
      ? `Stock value: ${money(materials.stock_value)}. Low stock: ${materials.low_stock}. Out of stock: ${materials.out_of_stock}.`
      : "BuildPilot does not have enough stock data to answer stock questions.",
    "",
    used.length ? used.join("\n") : "No material usage was recorded in this period.",
    "",
    "Based on material transactions in BuildPilot.",
  ].join("\n");
}

export function formatExpenses(expenses: AIExpenseSnapshot): string {
  const largest = expenses.largest
    .slice(0, 6)
    .map(
      (item) =>
        `- ${item.date}: ${item.description} (${item.category}) — ${money(item.amount)}`,
    );

  return [
    "## Expenses",
    "",
    `Active expenses: ${money(expenses.total_amount)} (${expenses.active_count} records)`,
    `This month: ${money(expenses.this_month_amount)}`,
    "",
    largest.length ? largest.join("\n") : "No expenses were recorded.",
    "",
    "Based on project expenses in BuildPilot.",
  ].join("\n");
}

export function formatClientUpdate(draft: ClientUpdateDraft): string {
  return [
    `## ${draft.title}`,
    "",
    "### This week's progress",
    ...(draft.this_week.length
      ? draft.this_week.map((item) => `- ${item}`)
      : ["- No progress was recorded for this period."]),
    "",
    draft.current_progress ? `**Current progress:** ${draft.current_progress}` : "",
    "",
    "### Upcoming",
    ...(draft.upcoming.length
      ? draft.upcoming.map((item) => `- ${item}`)
      : ["- No upcoming work is recorded."]),
    "",
    "### Issues",
    ...(draft.issues.length
      ? draft.issues.map((item) => `- ${item}`)
      : ["- No issues were reported."]),
    "",
    draft.closing,
    "",
    "This is a draft for you to review. It has not been published to the client portal.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function formatDailyReportDraft(draft: DailyReportDraft): string {
  return [
    "## Daily report draft",
    "",
    `Date: ${draft.report_date}`,
    "",
    "### Work completed",
    draft.work_completed,
    "",
    "### Issues",
    draft.issues || "None recorded.",
    "",
    "### Tomorrow's plan",
    draft.tomorrow_plan || "Not specified.",
    "",
    "### General notes",
    draft.general_notes || "None.",
    "",
    "Review this draft before saving. It will not be saved until you confirm.",
  ].join("\n");
}

export function formatContextFallback(context: AIContextPayload): string {
  if (context.missing.length && !context.project && !context.projects?.length) {
    return formatMissing(context.missing[0] ?? "I don't have enough project data to answer that.");
  }

  const parts: string[] = [];

  if (context.project) {
    parts.push(
      `## ${context.project.name}`,
      `Status: ${context.project.status}`,
      context.project.location ? `Location: ${context.project.location}` : "",
    );
  }

  if (context.boq) {
    parts.push(formatBOQ(context.boq, context.intent === "BOQ_PROGRESS" ? undefined : undefined));
  }

  if (context.cost) {
    parts.push(formatProjectCost(context.cost));
  }

  if (context.labour) {
    parts.push(formatLabour(context.labour));
  }

  if (context.materials) {
    parts.push(formatMaterials(context.materials));
  }

  if (context.expenses) {
    parts.push(formatExpenses(context.expenses));
  }

  if (context.site_reports?.length) {
    parts.push(
      "## Recent site activity",
      ...context.site_reports.slice(0, 5).map((report) => {
        const issue = report.issues ? ` Issues: ${report.issues}` : "";
        return `- ${report.report_date}: ${report.work_completed}${issue}`;
      }),
    );
  }

  if (context.projects?.length) {
    parts.push(
      "## Projects",
      ...context.projects.map(
        (project) =>
          `- ${project.name} (${project.status})${project.budget_status ? ` — ${project.budget_status.replaceAll("_", " ")}` : ""}`,
      ),
    );
  }

  if (!parts.length) {
    return formatMissing("I don't have enough project data to answer that.");
  }

  parts.push("", "Based on BuildPilot project data.");
  return parts.filter(Boolean).join("\n");
}
