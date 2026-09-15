import { Card, CardContent } from "@/components/ui/card";
import { moneyToPaise } from "@/lib/costs/calculations";
import type { ProjectCostOverview } from "@/lib/costs/types";
import { formatLabourCost } from "@/lib/labour/money";
import type { ProjectStats } from "@/lib/projects/queries";
import { cn } from "@/lib/utils";
import Link from "next/link";

const STATUS_SEGMENTS = [
  {
    key: "active" as const,
    label: "Active",
    color: "#d97706",
    href: "/projects?status=active",
  },
  {
    key: "planning" as const,
    label: "Planning",
    color: "#78716c",
    href: "/projects?status=planning",
  },
  {
    key: "completed" as const,
    label: "Completed",
    color: "#059669",
    href: "/projects?status=completed",
  },
] as const;

const COST_SEGMENTS = [
  {
    key: "labour" as const,
    label: "Labour",
    color: "#d97706",
    href: "/workers",
  },
  {
    key: "materials" as const,
    label: "Materials",
    color: "#0ea5e9",
    href: "/materials",
  },
  {
    key: "expenses" as const,
    label: "Expenses",
    color: "#ea580c",
    href: "/projects",
  },
] as const;

function DonutChart({
  segments,
  total,
}: {
  segments: Array<{
    label: string;
    value: number;
    color: string;
    href: string;
  }>;
  total: number;
}) {
  const size = 112;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const visible = segments.filter((segment) => segment.value > 0);

  return (
    <div className="flex items-center gap-4">
      <Link
        href="/projects"
        className="relative shrink-0 rounded-full outline-offset-2 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600"
        aria-label="View all projects"
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f5f5f4"
            strokeWidth={stroke}
          />
          {total > 0
            ? visible.map((segment) => {
                const length = (segment.value / total) * circumference;
                const dashOffset = -offset;
                offset += length;
                return (
                  <circle
                    key={segment.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth={stroke}
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={dashOffset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  />
                );
              })
            : null}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-lg font-semibold leading-none text-stone-900">
            {total}
          </p>
          <p className="mt-0.5 text-[10px] text-stone-500">total</p>
        </div>
      </Link>
      <ul className="min-w-0 flex-1 space-y-1">
        {segments.map((segment) => (
          <li key={segment.label}>
            <Link
              href={segment.href}
              className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5 text-xs hover:bg-stone-50"
            >
              <span className="inline-flex items-center gap-1.5 truncate text-stone-600">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: segment.color }}
                  aria-hidden
                />
                {segment.label}
              </span>
              <span className="tabular-nums text-stone-800">
                {segment.value}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BudgetBars({ projects }: { projects: ProjectCostOverview[] }) {
  const rows = projects
    .map((project) => {
      const spent = moneyToPaise(project.actual_cost);
      const budget = moneyToPaise(project.estimated_budget);
      return { ...project, spent, budget };
    })
    .filter((row) => row.spent > 0 || row.budget > 0)
    .slice(0, 5);

  if (!rows.length) {
    return (
      <p className="text-xs text-stone-500">
        Record costs to compare spend against budget.{" "}
        <Link href="/projects" className="font-medium text-amber-700 hover:text-amber-800">
          Open projects
        </Link>
      </p>
    );
  }

  const max = Math.max(...rows.map((row) => Math.max(row.spent, row.budget)), 1);

  return (
    <div className="space-y-2.5">
      {rows.map((row) => {
        const spentPct = Math.min(100, (row.spent / max) * 100);
        const over = row.budget > 0 && row.spent > row.budget;
        const used =
          row.budget > 0
            ? Math.round((row.spent / row.budget) * 100)
            : null;

        return (
          <Link
            key={row.project_id}
            href={`/projects/${row.project_id}/expenses`}
            className="block rounded-md px-1 py-0.5 hover:bg-stone-50"
          >
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <p className="truncate text-xs font-medium text-stone-800">
                {row.project_name}
              </p>
              <p
                className={cn(
                  "shrink-0 text-[11px] tabular-nums",
                  over ? "font-medium text-red-600" : "text-stone-500",
                )}
              >
                {used != null ? `${used}%` : formatLabourCost(row.actual_cost)}
              </p>
            </div>
            <div className="relative h-1.5 overflow-hidden rounded-full bg-stone-100">
              {row.budget > 0 ? (
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-stone-200"
                  style={{
                    width: `${Math.min(100, (row.budget / max) * 100)}%`,
                  }}
                />
              ) : null}
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full",
                  over ? "bg-red-500" : "bg-amber-600",
                )}
                style={{ width: `${spentPct}%` }}
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function CostMixChart({ projects }: { projects: ProjectCostOverview[] }) {
  const labour = projects.reduce(
    (sum, project) => sum + moneyToPaise(project.labour_cost),
    0,
  );
  const materials = projects.reduce(
    (sum, project) => sum + moneyToPaise(project.material_cost),
    0,
  );
  const expenses = projects.reduce(
    (sum, project) => sum + moneyToPaise(project.other_expenses),
    0,
  );
  const total = labour + materials + expenses;

  const topProject = projects[0];
  const segments = [
    {
      ...COST_SEGMENTS[0],
      paise: labour,
      href: topProject
        ? `/projects/${topProject.project_id}/labour`
        : COST_SEGMENTS[0].href,
    },
    {
      ...COST_SEGMENTS[1],
      paise: materials,
      href: topProject
        ? `/projects/${topProject.project_id}/materials`
        : COST_SEGMENTS[1].href,
    },
    {
      ...COST_SEGMENTS[2],
      paise: expenses,
      href: topProject
        ? `/projects/${topProject.project_id}/expenses`
        : COST_SEGMENTS[2].href,
    },
  ];

  if (total <= 0) {
    return (
      <p className="text-xs text-stone-500">
        Labour, materials, and expenses will split here.{" "}
        <Link href="/projects" className="font-medium text-amber-700 hover:text-amber-800">
          Open projects
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-stone-100">
        {segments.map((segment) => {
          const width = (segment.paise / total) * 100;
          if (width <= 0) {
            return null;
          }
          return (
            <Link
              key={segment.key}
              href={segment.href}
              className="h-full transition-opacity hover:opacity-80"
              style={{
                width: `${width}%`,
                backgroundColor: segment.color,
              }}
              title={`${segment.label}: ${formatLabourCost(segment.paise / 100)}`}
              aria-label={`View ${segment.label.toLowerCase()}`}
            />
          );
        })}
      </div>
      <ul className="space-y-1.5">
        {segments.map((segment) => {
          const percent = Math.round((segment.paise / total) * 100);
          return (
            <li key={segment.key}>
              <Link
                href={segment.href}
                className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5 text-xs hover:bg-stone-50"
              >
                <span className="inline-flex items-center gap-1.5 text-stone-600">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: segment.color }}
                    aria-hidden
                  />
                  {segment.label}
                </span>
                <span className="tabular-nums text-stone-800">
                  {percent}%
                  <span className="ml-1.5 text-stone-400">
                    {formatLabourCost(segment.paise / 100)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-stone-500">
        Total {formatLabourCost(total / 100)} across {projects.length} project
        {projects.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function summarizeCosts(projects: ProjectCostOverview[]) {
  const totalSpendPaise = projects.reduce(
    (sum, project) => sum + moneyToPaise(project.actual_cost),
    0,
  );
  const totalBudgetPaise = projects.reduce(
    (sum, project) => sum + moneyToPaise(project.estimated_budget),
    0,
  );
  const overBudget = projects.filter(
    (project) => project.status === "over_budget",
  ).length;

  return {
    totalSpend: totalSpendPaise / 100,
    totalBudget: totalBudgetPaise / 100,
    overBudget,
    withBudget: projects.filter((project) => project.estimated_budget).length,
  };
}

export function DashboardCharts({
  stats,
  costOverviews,
}: {
  stats: ProjectStats;
  costOverviews: ProjectCostOverview[];
}) {
  const other = Math.max(
    0,
    stats.total - stats.active - stats.planning - stats.completed,
  );

  const statusSegments = [
    ...STATUS_SEGMENTS.map((segment) => ({
      label: segment.label,
      value: stats[segment.key],
      color: segment.color,
      href: segment.href,
    })),
    ...(other > 0
      ? [
          {
            label: "Other",
            value: other,
            color: "#a8a29e",
            href: "/projects",
          },
        ]
      : []),
  ];

  return (
    <section className="grid gap-3 lg:grid-cols-3">
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">
              Status mix
            </p>
            <Link
              href="/projects"
              className="text-[11px] font-medium text-amber-700 hover:text-amber-800"
            >
              Projects
            </Link>
          </div>
          <DonutChart segments={statusSegments} total={stats.total} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">
              Budget vs spend
            </p>
            <Link
              href="/projects"
              className="text-[11px] font-medium text-amber-700 hover:text-amber-800"
            >
              Projects
            </Link>
          </div>
          <BudgetBars projects={costOverviews} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">
              Cost mix
            </p>
            <Link
              href="/projects"
              className="text-[11px] font-medium text-amber-700 hover:text-amber-800"
            >
              Projects
            </Link>
          </div>
          <CostMixChart projects={costOverviews} />
        </CardContent>
      </Card>
    </section>
  );
}

export function BudgetProgressBar({
  percent,
  status,
  compact = false,
}: {
  percent: number | null;
  status: ProjectCostOverview["status"];
  compact?: boolean;
}) {
  if (percent == null) {
    return (
      <div
        className={cn(
          "overflow-hidden rounded-full bg-stone-100",
          compact ? "h-1.5" : "mt-3 h-2",
        )}
      >
        <div className="h-full w-0 rounded-full bg-stone-300" />
      </div>
    );
  }

  const width = Math.min(100, Math.max(0, percent));

  return (
    <div className={cn(!compact && "mt-3")}>
      {!compact ? (
        <div className="mb-1 flex justify-between text-xs text-stone-500">
          <span>Budget used</span>
          <span className="tabular-nums">
            {percent % 1 === 0 ? percent : percent.toFixed(1)}%
          </span>
        </div>
      ) : null}
      <div
        className={cn(
          "overflow-hidden rounded-full bg-stone-100",
          compact ? "h-1.5" : "h-2",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full",
            status === "over_budget"
              ? "bg-red-500"
              : status === "within_budget"
                ? "bg-emerald-500"
                : "bg-stone-400",
          )}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
