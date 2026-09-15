import { Alert } from "@/components/ui/alert";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { linkButtonClassName } from "@/components/ui/button";
import {
  BudgetProgressBar,
  DashboardCharts,
  summarizeCosts,
} from "@/components/dashboard/dashboard-charts";
import { DashboardNextSteps } from "@/components/dashboard/dashboard-next-steps";
import { WithIcon } from "@/components/ui/with-icon";
import { getClientPortalEnabledCount } from "@/lib/client-portal/queries";
import { getRecentProjectCostOverviews } from "@/lib/costs/queries";
import { workPreview } from "@/lib/daily-reports/display";
import { getRecentDailyReports } from "@/lib/daily-reports/queries";
import { formatLabourCost } from "@/lib/labour/money";
import { getBusinessPendingActionSummary } from "@/lib/project-actions/queries";
import { getProjectStats, getRecentProjects } from "@/lib/projects/queries";
import { cn, formatDate, formatTimestamp } from "@/lib/utils";
import { getWorkspaceContext } from "@/lib/workspace";
import type { Metadata } from "next";
import {
  AlertTriangle,
  Bot,
  CircleDot,
  ClipboardList,
  FolderKanban,
  Globe,
  Plus,
  Wallet,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const { profile, business, user } = await getWorkspaceContext();
  const displayName = profile?.full_name ?? user.email ?? "there";

  if (!business) {
    return (
      <Alert variant="error">
        Your account does not have a business workspace yet. Sign out and create
        a new account, or rerun the database migration.
      </Alert>
    );
  }

  const [
    { stats, error: statsError },
    { projects, error: recentError },
    { reports: recentReports, error: reportsError },
    { projects: costOverviews, error: costError },
    { count: clientPortalCount },
    { summary: actionSummary },
  ] = await Promise.all([
    getProjectStats(),
    getRecentProjects(6),
    getRecentDailyReports(6),
    getRecentProjectCostOverviews(6),
    getClientPortalEnabledCount(),
    getBusinessPendingActionSummary(),
  ]);

  const costSummary = summarizeCosts(costOverviews);
  const costByProject = new Map(
    costOverviews.map((overview) => [overview.project_id, overview]),
  );

  const firstOverBudget = costOverviews.find(
    (overview) => overview.status === "over_budget",
  );
  const latestReport = recentReports[0];
  const firstProject = projects[0];

  const kpis = [
    {
      label: "Projects",
      value: String(stats.total),
      hint: `${stats.active} active`,
      icon: FolderKanban,
      href: "/projects",
    },
    {
      label: "In progress",
      value: String(stats.active),
      hint: `${stats.planning} planning`,
      icon: CircleDot,
      href: "/projects?status=active",
    },
    {
      label: "Recent spend",
      value: formatLabourCost(costSummary.totalSpend),
      hint:
        costSummary.totalBudget > 0
          ? `of ${formatLabourCost(costSummary.totalBudget)} budget`
          : "no budgets set",
      icon: Wallet,
      href: firstProject
        ? `/projects/${firstProject.id}/expenses`
        : "/projects",
    },
    {
      label: "Over budget",
      value: String(costSummary.overBudget),
      hint:
        costSummary.withBudget > 0
          ? `of ${costSummary.withBudget} with budget`
          : "set project budgets",
      icon: AlertTriangle,
      alert: costSummary.overBudget > 0,
      href: firstOverBudget
        ? `/projects/${firstOverBudget.project_id}/expenses`
        : "/projects",
    },
    {
      label: "Site reports",
      value: String(recentReports.length),
      hint: latestReport
        ? `latest ${formatDate(latestReport.report_date)}`
        : "none yet",
      icon: ClipboardList,
      href: latestReport
        ? `/projects/${latestReport.project_id}/reports`
        : firstProject
          ? `/projects/${firstProject.id}/reports`
          : "/projects",
    },
    {
      label: "Client portals",
      value: String(clientPortalCount),
      hint: clientPortalCount > 0 ? "sharing enabled" : "not enabled",
      icon: Globe,
      href: firstProject
        ? `/projects/${firstProject.id}/client-portal`
        : "/projects",
    },
  ];

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/account"
            className="truncate text-xl font-semibold text-stone-900 hover:text-amber-800"
          >
            {business.name}
          </Link>
          <p className="mt-0.5 text-sm text-stone-500">
            Welcome back, {displayName}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/ai"
            className={cn(linkButtonClassName("secondary", "sm"))}
          >
            <WithIcon icon={Bot}>AI</WithIcon>
          </Link>
          <Link
            href="/projects/new"
            className={cn(linkButtonClassName("primary", "sm"))}
          >
            <WithIcon icon={Plus}>New project</WithIcon>
          </Link>
        </div>
      </div>

      {statsError ? (
        <Alert variant="error">{statsError}</Alert>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Link
                key={kpi.label}
                href={kpi.href}
                className="rounded-xl border border-stone-200 bg-white shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50/40"
              >
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-medium tracking-wide text-stone-500 uppercase">
                      {kpi.label}
                    </p>
                    <Icon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        kpi.alert ? "text-red-600" : "text-stone-400",
                      )}
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </div>
                  <p
                    className={cn(
                      "mt-1 truncate text-lg font-semibold tabular-nums",
                      kpi.alert ? "text-red-700" : "text-stone-900",
                    )}
                  >
                    {kpi.value}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-stone-500">
                    {kpi.hint}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        <DashboardNextSteps
          totalPending={actionSummary.totalPending}
          projectsWithActions={actionSummary.projectsWithActions}
          byType={actionSummary.byType}
          actions={actionSummary.actions}
        />
      </div>

      {!statsError ? (
        <div className="mt-4">
          <DashboardCharts stats={stats} costOverviews={costOverviews} />
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        <section className="xl:col-span-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-stone-900">
              Recent projects
            </h3>
            <Link
              href="/projects"
              className="text-xs font-medium text-amber-700 hover:text-amber-800"
            >
              View all
            </Link>
          </div>

          {recentError || costError ? (
            <Alert variant="error">{recentError || costError}</Alert>
          ) : !projects.length ? (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium text-stone-800">
                  No projects yet
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  Create a project to start tracking site work and costs.
                </p>
                <Link
                  href="/projects/new"
                  className={cn(linkButtonClassName("primary", "sm"), "mt-3")}
                >
                  <WithIcon icon={Plus}>Create project</WithIcon>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-xl border border-stone-200 bg-white md:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-stone-50 text-xs text-stone-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Project</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Spend</th>
                      <th className="px-3 py-2 font-medium">Budget</th>
                      <th className="px-3 py-2 font-medium">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => {
                      const cost = costByProject.get(project.id);
                      return (
                        <tr
                          key={project.id}
                          className="border-t border-stone-100 hover:bg-stone-50/80"
                        >
                          <td className="px-3 py-2.5">
                            <Link
                              href={`/projects/${project.id}`}
                              className="font-medium text-stone-900 hover:text-amber-700"
                            >
                              {project.name}
                            </Link>
                            <p className="text-xs text-stone-500">
                              {project.client_name || "No client"}
                            </p>
                          </td>
                          <td className="px-3 py-2.5">
                            <Link href={`/projects?status=${project.status}`}>
                              <StatusBadge status={project.status} />
                            </Link>
                          </td>
                          <td className="px-3 py-2.5">
                            <Link
                              href={`/projects/${project.id}/expenses`}
                              className="tabular-nums text-stone-700 hover:text-amber-700"
                            >
                              {cost
                                ? formatLabourCost(cost.actual_cost)
                                : "—"}
                            </Link>
                          </td>
                          <td className="min-w-[7rem] px-3 py-2.5">
                            {cost ? (
                              <Link
                                href={`/projects/${project.id}/expenses`}
                                className="block space-y-1"
                              >
                                <p className="text-xs tabular-nums text-stone-600">
                                  {cost.budget_used_percent != null
                                    ? `${cost.budget_used_percent % 1 === 0 ? cost.budget_used_percent : cost.budget_used_percent.toFixed(0)}%`
                                    : "—"}
                                  {cost.status === "over_budget" ? (
                                    <span className="ml-1 text-red-600">
                                      over
                                    </span>
                                  ) : null}
                                </p>
                                <BudgetProgressBar
                                  percent={cost.budget_used_percent}
                                  status={cost.status}
                                  compact
                                />
                              </Link>
                            ) : (
                              <span className="text-stone-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-stone-500">
                            <Link
                              href={`/projects/${project.id}`}
                              className="hover:text-amber-700"
                            >
                              {formatTimestamp(project.updated_at)}
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2 md:hidden">
                {projects.map((project) => {
                  const cost = costByProject.get(project.id);
                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="block rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-stone-900">
                            {project.name}
                          </p>
                          <p className="text-xs text-stone-500">
                            {project.client_name || "No client"}
                          </p>
                        </div>
                        <StatusBadge status={project.status} />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-stone-600">
                        <span className="tabular-nums">
                          {cost
                            ? formatLabourCost(cost.actual_cost)
                            : "No spend"}
                        </span>
                        <span className="text-stone-400">
                          {formatTimestamp(project.updated_at)}
                        </span>
                      </div>
                      {cost ? (
                        <div className="mt-2">
                          <BudgetProgressBar
                            percent={cost.budget_used_percent}
                            status={cost.status}
                            compact
                          />
                        </div>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <section className="xl:col-span-2">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-stone-900">
              Latest site updates
            </h3>
            {latestReport ? (
              <Link
                href={`/projects/${latestReport.project_id}/reports`}
                className="text-xs font-medium text-amber-700 hover:text-amber-800"
              >
                View reports
              </Link>
            ) : firstProject ? (
              <Link
                href={`/projects/${firstProject.id}/reports/new`}
                className="text-xs font-medium text-amber-700 hover:text-amber-800"
              >
                Add report
              </Link>
            ) : null}
          </div>

          {reportsError ? (
            <Alert variant="error">{reportsError}</Alert>
          ) : !recentReports.length ? (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium text-stone-800">
                  No daily reports yet
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  Open a project and log what happened on site.
                </p>
                {firstProject ? (
                  <Link
                    href={`/projects/${firstProject.id}/reports/new`}
                    className={cn(linkButtonClassName("primary", "sm"), "mt-3")}
                  >
                    <WithIcon icon={Plus}>Add report</WithIcon>
                  </Link>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="divide-y divide-stone-100 p-0">
                {recentReports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/projects/${report.project_id}/reports/${report.id}`}
                    className="block px-3 py-2.5 hover:bg-stone-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium text-stone-900">
                        {report.project_name || "Project"}
                      </p>
                      <p className="shrink-0 text-[11px] tabular-nums text-stone-500">
                        {formatDate(report.report_date)}
                      </p>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">
                      {workPreview(report.work_completed) || "No work notes"}
                    </p>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </>
  );
}
