"use client";

import {
  BudgetDonut,
  CircularProgress,
  HealthPill,
  MonthlySpendChart,
  StageRail,
  type StageItem,
} from "@/components/projects/project-visuals";
import { ProjectActions } from "@/components/projects/project-actions";
import { StatusBadge } from "@/components/ui/badge";
import { linkButtonClassName } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WithIcon } from "@/components/ui/with-icon";
import { PROJECT_STATUS_LABELS } from "@/constants/project";
import { useApiData } from "@/hooks/use-api-data";
import { formatCompletionPercent } from "@/lib/boq/calculations";
import type { BoqListResult, BoqSectionSummary } from "@/lib/boq/types";
import { moneyToPaise } from "@/lib/costs/calculations";
import type { ProjectCostDashboard } from "@/lib/costs/types";
import { workPreview } from "@/lib/daily-reports/display";
import type { DailyReportListItem } from "@/lib/daily-reports/types";
import { formatLabourCost, parseIsoDate, todayIsoDate } from "@/lib/labour/money";
import { cn, formatDate } from "@/lib/utils";
import type { Project, ProjectStatus } from "@/types";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  Hammer,
  MapPin,
  Sparkles,
  Timer,
  Wallet,
} from "lucide-react";
import Link from "next/link";

type ReportsResponse = {
  reports: DailyReportListItem[];
  total: number;
};

type HealthInfo = {
  label: string;
  tone: "good" | "warn" | "bad" | "neutral";
  hint: string;
};

function daysUntil(dateValue: string | null): number | null {
  if (!dateValue) {
    return null;
  }
  const end = parseIsoDate(dateValue);
  if (!end) {
    return null;
  }
  const today = parseIsoDate(todayIsoDate());
  if (!today) {
    return null;
  }
  const ms = end.getTime() - today.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function deriveHealth(input: {
  status: ProjectStatus;
  archived: boolean;
  completion: number | null;
  budgetStatus: ProjectCostDashboard["budget"]["status"] | null;
  daysLeft: number | null;
}): HealthInfo {
  if (input.archived) {
    return {
      label: "Archived",
      tone: "neutral",
      hint: "This project is archived.",
    };
  }

  if (input.status === "completed") {
    return {
      label: "Completed",
      tone: "good",
      hint: "All marked work is finished.",
    };
  }

  if (input.status === "cancelled") {
    return {
      label: "Cancelled",
      tone: "neutral",
      hint: "This project was cancelled.",
    };
  }

  if (input.status === "on_hold") {
    return {
      label: "On hold",
      tone: "warn",
      hint: "Work is paused for now.",
    };
  }

  if (input.status === "planning") {
    return {
      label: "Planning",
      tone: "neutral",
      hint: "Site work has not started yet.",
    };
  }

  if (input.budgetStatus === "over_budget") {
    return {
      label: "Needs attention",
      tone: "bad",
      hint: "Spending is above the planned budget.",
    };
  }

  if (input.daysLeft != null && input.daysLeft < 0) {
    return {
      label: "Delayed",
      tone: "bad",
      hint: "Past the expected finish date.",
    };
  }

  if (
    input.daysLeft != null &&
    input.daysLeft <= 14 &&
    (input.completion == null || input.completion < 80)
  ) {
    return {
      label: "Needs attention",
      tone: "warn",
      hint: "Finish date is near and work is still open.",
    };
  }

  return {
    label: "On track",
    tone: "good",
    hint: "Progress and budget look healthy.",
  };
}

function buildStages(sections: BoqSectionSummary[]): StageItem[] {
  const byId = new Map<string, BoqSectionSummary>();
  for (const section of sections) {
    byId.set(section.id, section);
  }

  return [...byId.values()]
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, 6)
    .map((section) => {
      const percent = section.completion_percentage;
      const state: StageItem["state"] =
        percent != null && percent >= 99.5
          ? "completed"
          : percent != null && percent > 0
            ? "in_progress"
            : "upcoming";

      return {
        id: section.id,
        name: section.name,
        percent,
        state,
      };
    });
}

function statusStages(status: ProjectStatus): StageItem[] {
  const order: ProjectStatus[] = ["planning", "active", "completed"];
  const currentIndex =
    status === "on_hold"
      ? 1
      : status === "cancelled"
        ? 0
        : Math.max(0, order.indexOf(status));

  return order.map((item, index) => ({
    id: item,
    name: PROJECT_STATUS_LABELS[item],
    percent:
      index < currentIndex ? 100 : index === currentIndex ? 50 : null,
    state:
      index < currentIndex
        ? "completed"
        : index === currentIndex
          ? "in_progress"
          : "upcoming",
  }));
}

function monthLabel(isoMonthStart: string): string {
  const date = parseIsoDate(isoMonthStart);
  if (!date) {
    return isoMonthStart;
  }
  return date.toLocaleDateString(undefined, { month: "short" });
}

function budgetPlainLabel(
  status: ProjectCostDashboard["budget"]["status"],
  usedPercent: number | null,
): string {
  if (status === "over_budget") {
    return "Over budget";
  }
  if (status === "no_budget") {
    return "No budget set";
  }
  if (usedPercent != null && usedPercent >= 85) {
    return "Nearing budget limit";
  }
  return "Within budget";
}

export function ProjectDashboard({ project }: { project: Project }) {
  const costUrl = `/api/projects/${project.id}/cost`;
  const boqUrl = `/api/projects/${project.id}/boq?page_size=1`;
  const reportsUrl = `/api/projects/${project.id}/reports?page_size=5`;

  const {
    data: cost,
    error: costError,
    isLoading: costLoading,
  } = useApiData<ProjectCostDashboard>(costUrl);
  const {
    data: boq,
    error: boqError,
    isLoading: boqLoading,
  } = useApiData<BoqListResult>(boqUrl);
  const {
    data: reportsData,
    error: reportsError,
    isLoading: reportsLoading,
  } = useApiData<ReportsResponse>(reportsUrl);

  const summary = boq && boq.total > 0 ? boq.dashboard.summary : null;
  const completion = summary?.completion_percentage ?? null;
  const daysLeft = daysUntil(project.expected_end_date);
  const health = deriveHealth({
    status: project.status,
    archived: Boolean(project.archived_at),
    completion,
    budgetStatus: cost?.budget.status ?? null,
    daysLeft,
  });

  const sectionPool = [
    ...(boq?.dashboard.top_completed_sections ?? []),
    ...(boq?.dashboard.remaining_sections ?? []),
  ];
  const stages =
    sectionPool.length > 0
      ? buildStages(sectionPool)
      : statusStages(project.status);

  const remainingSections = boq?.dashboard.remaining_sections.length ?? 0;
  const completedSections =
    boq?.dashboard.top_completed_sections.filter(
      (section) => (section.completion_percentage ?? 0) >= 99.5,
    ).length ?? 0;

  const alerts: Array<{ title: string; detail: string; href: string }> = [];

  if (cost?.budget.status === "over_budget") {
    alerts.push({
      title: "Budget exceeded",
      detail: `Spent ${formatLabourCost(cost.budget.actual_cost)} against ${formatLabourCost(cost.budget.estimated_budget)}.`,
      href: `/projects/${project.id}/expenses`,
    });
  } else if (
    cost?.budget.budget_used_percent != null &&
    cost.budget.budget_used_percent >= 85 &&
    cost.budget.status === "within_budget"
  ) {
    alerts.push({
      title: "Budget nearly used up",
      detail: `${Math.round(cost.budget.budget_used_percent)}% of the budget is already spent.`,
      href: `/projects/${project.id}/expenses`,
    });
  }

  if (daysLeft != null && daysLeft < 0 && project.status !== "completed") {
    alerts.push({
      title: "Past expected finish date",
      detail: `Expected by ${formatDate(project.expected_end_date)}.`,
      href: `/projects/${project.id}/edit`,
    });
  } else if (daysLeft != null && daysLeft <= 14 && project.status === "active") {
    alerts.push({
      title: "Finish date approaching",
      detail:
        daysLeft === 0
          ? "Expected to finish today."
          : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left until the expected finish date.`,
      href: `/projects/${project.id}/boq`,
    });
  }

  if (project.status === "on_hold") {
    alerts.push({
      title: "Project is on hold",
      detail: "Resume work when you are ready to continue.",
      href: `/projects/${project.id}/edit`,
    });
  }

  if (!boqLoading && (!boq || boq.total === 0) && project.status === "active") {
    alerts.push({
      title: "No work list yet",
      detail: "Add a bill of quantities to track what is completed on site.",
      href: `/projects/${project.id}/boq`,
    });
  }

  const trendMonths =
    cost?.trend.map((row) => ({
      label: monthLabel(row.month_start),
      total: moneyToPaise(row.total_cost) / 100,
    })) ?? [];

  const measurements = boq?.dashboard.recent_measurements.slice(0, 4) ?? [];
  const reports = reportsData?.reports.slice(0, 4) ?? [];

  const activity: Array<{
    id: string;
    title: string;
    detail: string;
    when: string;
    href: string;
  }> = [
    ...measurements.map((item) => ({
      id: `m-${item.id}`,
      title: "Work measured",
      detail: item.item_description,
      when: formatDate(item.measurement_date),
      href: `/projects/${project.id}/boq`,
    })),
    ...reports.map((report) => ({
      id: `r-${report.id}`,
      title: "Site update",
      detail: workPreview(report.work_completed) || "Daily report logged",
      when: formatDate(report.report_date),
      href: `/projects/${project.id}/reports/${report.id}`,
    })),
  ].slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Overview hero */}
      <section className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="text-lg font-semibold text-stone-900 sm:text-xl">
                {project.name}
              </h2>
              <StatusBadge status={project.status} />
              <HealthPill label={health.label} tone={health.tone} />
              {project.archived_at ? (
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                  Archived
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-stone-500">{health.hint}</p>

            <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:grid-cols-4">
              <div className="min-w-0">
                <dt className="text-stone-500">Client</dt>
                <dd className="truncate font-medium text-stone-800">
                  {project.client_name || "—"}
                </dd>
                {project.client_phone || project.client_email ? (
                  <dd className="truncate text-[11px] text-stone-500">
                    {[project.client_phone, project.client_email]
                      .filter(Boolean)
                      .join(" · ")}
                  </dd>
                ) : null}
              </div>
              <div className="min-w-0">
                <dt className="inline-flex items-center gap-1 text-stone-500">
                  <MapPin className="h-3 w-3" strokeWidth={1.75} aria-hidden />
                  Location
                </dt>
                <dd className="truncate font-medium text-stone-800">
                  {project.location || "—"}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-stone-500">Started</dt>
                <dd className="font-medium text-stone-800">
                  {formatDate(project.start_date)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-stone-500">Expected finish</dt>
                <dd className="font-medium text-stone-800">
                  {formatDate(project.expected_end_date)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <CircularProgress
              percent={completion}
              size={84}
              stroke={8}
              label="done"
              sublabel={
                summary
                  ? `${formatLabourCost(summary.completed_value)} / ${formatLabourCost(summary.estimated_value)}`
                  : "No work list"
              }
            />
            <div className="flex flex-col gap-1.5">
              <Link
                href={`/projects/${project.id}/ai`}
                className={linkButtonClassName("secondary", "sm")}
              >
                <WithIcon icon={Sparkles}>Ask AI</WithIcon>
              </Link>
              <ProjectActions
                projectId={project.id}
                projectName={project.name}
                archived={Boolean(project.archived_at)}
                showView={false}
                layout="row"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Health strip */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {[
          {
            label: "Progress",
            value: formatCompletionPercent(completion),
            hint: completion == null ? "No work list" : "Work completed",
            icon: CheckCircle2,
            href: `/projects/${project.id}/boq`,
          },
          {
            label: "Budget",
            value: cost
              ? budgetPlainLabel(
                  cost.budget.status,
                  cost.budget.budget_used_percent,
                )
              : costLoading
                ? "…"
                : "—",
            hint: cost
              ? formatLabourCost(cost.budget.actual_cost)
              : "Spending so far",
            icon: Wallet,
            href: `/projects/${project.id}/expenses`,
            alert: cost?.budget.status === "over_budget",
          },
          {
            label: "Work done",
            value: summary
              ? formatLabourCost(summary.completed_value)
              : "—",
            hint: "Completed value",
            icon: Hammer,
            href: `/projects/${project.id}/boq`,
          },
          {
            label: "Work left",
            value: summary
              ? formatLabourCost(summary.remaining_value)
              : "—",
            hint:
              remainingSections > 0
                ? `${remainingSections} stage${remainingSections === 1 ? "" : "s"} open`
                : "Remaining value",
            icon: ClipboardList,
            href: `/projects/${project.id}/boq`,
          },
          {
            label: "Days left",
            value:
              daysLeft == null
                ? "—"
                : daysLeft < 0
                  ? `${Math.abs(daysLeft)}d late`
                  : String(daysLeft),
            hint:
              daysLeft == null
                ? "Set a finish date"
                : daysLeft < 0
                  ? "Behind schedule"
                  : daysLeft === 0
                    ? "Due today"
                    : "Until expected finish",
            icon: CalendarClock,
            href: `/projects/${project.id}/edit`,
            alert: daysLeft != null && daysLeft < 0,
          },
          {
            label: "Open stages",
            value: String(remainingSections),
            hint:
              completedSections > 0
                ? `${completedSections} finished`
                : "Still to complete",
            icon: Timer,
            href: `/projects/${project.id}/boq`,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50/30"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-medium tracking-wide text-stone-500 uppercase">
                  {item.label}
                </p>
                <Icon
                  className={cn(
                    "h-3.5 w-3.5",
                    item.alert ? "text-red-600" : "text-stone-400",
                  )}
                  strokeWidth={1.75}
                  aria-hidden
                />
              </div>
              <p
                className={cn(
                  "mt-1 truncate text-base font-semibold tabular-nums",
                  item.alert ? "text-red-700" : "text-stone-900",
                )}
              >
                {item.value}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-stone-500">
                {item.hint}
              </p>
            </Link>
          );
        })}
      </section>

      {alerts.length > 0 ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle
              className="h-4 w-4 text-amber-700"
              strokeWidth={1.75}
              aria-hidden
            />
            <h3 className="text-sm font-semibold text-amber-900">
              Needs your attention
            </h3>
          </div>
          <ul className="space-y-2">
            {alerts.map((alert) => (
              <li key={alert.title}>
                <Link
                  href={alert.href}
                  className="block rounded-lg bg-white/80 px-3 py-2 hover:bg-white"
                >
                  <p className="text-sm font-medium text-stone-900">
                    {alert.title}
                  </p>
                  <p className="text-xs text-stone-600">{alert.detail}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-5">
        {/* Budget */}
        <Card className="xl:col-span-2">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-stone-900">
                Money overview
              </h3>
              <Link
                href={`/projects/${project.id}/expenses`}
                className="text-xs font-medium text-amber-700 hover:text-amber-800"
              >
                Expenses
              </Link>
            </div>
            {costLoading ? (
              <Skeleton className="h-40 w-full rounded-lg" />
            ) : costError ? (
              <p className="text-sm text-red-600">{costError}</p>
            ) : cost ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <BudgetDonut
                  usedPercent={cost.budget.budget_used_percent}
                  status={cost.budget.status}
                />
                <div className="min-w-0 flex-1 space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-stone-500">Budget</span>
                    <span className="font-medium tabular-nums text-stone-900">
                      {formatLabourCost(cost.budget.estimated_budget)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-stone-500">Spent</span>
                    <span className="font-medium tabular-nums text-stone-900">
                      {formatLabourCost(cost.budget.actual_cost)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-stone-500">Left</span>
                    <span className="font-medium tabular-nums text-stone-900">
                      {formatLabourCost(cost.budget.remaining_budget)}
                    </span>
                  </div>
                  <HealthPill
                    label={budgetPlainLabel(
                      cost.budget.status,
                      cost.budget.budget_used_percent,
                    )}
                    tone={
                      cost.budget.status === "over_budget"
                        ? "bad"
                        : cost.budget.budget_used_percent != null &&
                            cost.budget.budget_used_percent >= 85
                          ? "warn"
                          : cost.budget.status === "within_budget"
                            ? "good"
                            : "neutral"
                    }
                  />
                  {Number(cost.totals.total_cost) > 0 ? (
                    <div className="pt-2">
                      <div className="flex h-2 overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="bg-amber-600"
                          style={{
                            width: `${cost.breakdown.labour.percent ?? 0}%`,
                          }}
                        />
                        <div
                          className="bg-sky-500"
                          style={{
                            width: `${cost.breakdown.materials.percent ?? 0}%`,
                          }}
                        />
                        <div
                          className="bg-orange-500"
                          style={{
                            width: `${cost.breakdown.expenses.percent ?? 0}%`,
                          }}
                        />
                      </div>
                      <ul className="mt-2 space-y-1 text-xs text-stone-600">
                        <li>
                          Labour · {formatLabourCost(cost.totals.labour_cost)}
                        </li>
                        <li>
                          Materials ·{" "}
                          {formatLabourCost(cost.totals.material_cost)}
                        </li>
                        <li>
                          Other · {formatLabourCost(cost.totals.other_expenses)}
                        </li>
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500">
                      Costs appear after attendance, purchases, or expenses.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Spend trend */}
        <Card className="xl:col-span-3">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-stone-900">
                Spending over time
              </h3>
              <Link
                href={`/projects/${project.id}/expenses`}
                className="text-xs font-medium text-amber-700 hover:text-amber-800"
              >
                Details
              </Link>
            </div>
            {costLoading ? (
              <Skeleton className="h-36 w-full rounded-lg" />
            ) : (
              <MonthlySpendChart months={trendMonths} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stages */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">
                Project stages
              </h3>
              <p className="text-xs text-stone-500">
                {sectionPool.length > 0
                  ? "Based on your work list sections"
                  : "High-level project status"}
              </p>
            </div>
            <Link
              href={`/projects/${project.id}/boq`}
              className="text-xs font-medium text-amber-700 hover:text-amber-800"
            >
              Work list
            </Link>
          </div>
          {boqLoading ? (
            <Skeleton className="h-24 w-full rounded-lg" />
          ) : boqError ? (
            <p className="text-sm text-red-600">{boqError}</p>
          ) : (
            <StageRail stages={stages} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tasks / work snapshot */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-stone-900">
                Work snapshot
              </h3>
              <Link
                href={`/projects/${project.id}/boq`}
                className="text-xs font-medium text-amber-700 hover:text-amber-800"
              >
                View BOQ
              </Link>
            </div>
            {boqLoading ? (
              <Skeleton className="h-28 w-full rounded-lg" />
            ) : !summary ? (
              <div className="rounded-lg border border-dashed border-stone-200 p-4 text-sm text-stone-500">
                No work list yet.{" "}
                <Link
                  href={`/projects/${project.id}/boq/new`}
                  className="font-medium text-amber-700 hover:text-amber-800"
                >
                  Create one
                </Link>{" "}
                to track completed vs remaining work.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="h-3 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-amber-600"
                    style={{
                      width: `${Math.min(100, Math.max(0, completion ?? 0))}%`,
                    }}
                  />
                </div>
                <p className="text-sm text-stone-700">
                  <span className="font-semibold text-stone-900">
                    {formatCompletionPercent(completion)} completed
                  </span>
                  {" · "}
                  {formatLabourCost(summary.remaining_value)} left
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-emerald-50 p-2">
                    <p className="text-lg font-semibold text-emerald-800">
                      {completedSections}
                    </p>
                    <p className="text-[11px] text-emerald-700">Done</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2">
                    <p className="text-lg font-semibold text-amber-800">
                      {Math.max(
                        0,
                        (boq?.dashboard.top_completed_sections.length ?? 0) -
                          completedSections,
                      )}
                    </p>
                    <p className="text-[11px] text-amber-700">In progress</p>
                  </div>
                  <div className="rounded-lg bg-stone-50 p-2">
                    <p className="text-lg font-semibold text-stone-800">
                      {remainingSections}
                    </p>
                    <p className="text-[11px] text-stone-600">Pending</p>
                  </div>
                </div>
                {boq?.boqs[0] ? (
                  <p className="text-xs text-stone-500">
                    Tracking{" "}
                    <Link
                      href={`/projects/${project.id}/boq/${boq.boqs[0].id}`}
                      className="font-medium text-amber-700 hover:text-amber-800"
                    >
                      {boq.boqs[0].name}
                    </Link>
                  </p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-stone-900">
                Recent activity
              </h3>
              <Link
                href={`/projects/${project.id}/reports`}
                className="text-xs font-medium text-amber-700 hover:text-amber-800"
              >
                Site updates
              </Link>
            </div>
            {boqLoading || reportsLoading ? (
              <Skeleton className="h-36 w-full rounded-lg" />
            ) : reportsError && activity.length === 0 ? (
              <p className="text-sm text-red-600">{reportsError}</p>
            ) : activity.length === 0 ? (
              <div className="rounded-lg border border-dashed border-stone-200 p-4 text-sm text-stone-500">
                No recent activity yet. Log a{" "}
                <Link
                  href={`/projects/${project.id}/reports/new`}
                  className="font-medium text-amber-700 hover:text-amber-800"
                >
                  site update
                </Link>{" "}
                or record measurements.
              </div>
            ) : (
              <ol className="space-y-0">
                {activity.map((item, index) => (
                  <li key={item.id} className="relative flex gap-3 pb-3">
                    {index < activity.length - 1 ? (
                      <span className="absolute top-2 left-[0.3rem] h-full w-px bg-stone-200" />
                    ) : null}
                    <span className="relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
                    <Link href={item.href} className="min-w-0 flex-1 hover:opacity-80">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-stone-900">
                          {item.title}
                        </p>
                        <span className="shrink-0 text-[11px] text-stone-500">
                          {item.when}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">
                        {item.detail}
                      </p>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          {
            href: `/projects/${project.id}/reports`,
            label: "Site updates",
            icon: FileText,
          },
          {
            href: `/projects/${project.id}/labour`,
            label: "Labour",
            icon: Hammer,
          },
          {
            href: `/projects/${project.id}/materials`,
            label: "Materials",
            icon: ClipboardList,
          },
          {
            href: `/projects/${project.id}/quotations`,
            label: "Quotations",
            icon: Wallet,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm font-medium text-stone-800 shadow-sm hover:border-amber-300 hover:bg-amber-50/40"
            >
              <Icon className="h-4 w-4 text-amber-700" strokeWidth={1.75} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </section>
    </div>
  );
}
