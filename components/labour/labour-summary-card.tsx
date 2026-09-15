import { LabourDateFilters } from "@/components/labour/labour-date-filters";
import { CompactPanel } from "@/components/projects/project-section-chrome";
import { WORKER_ROLE_PLURAL_LABELS } from "@/constants/worker";
import { formatLabourCost } from "@/lib/labour/money";
import type { LabourSummary } from "@/lib/labour/types";
import { formatDate } from "@/lib/utils";

export function LabourSummaryCard({
  summary,
  title = "Labour summary",
}: {
  summary: LabourSummary;
  title?: string;
}) {
  const rangeLabel =
    summary.from !== summary.to
      ? `${formatDate(summary.from)} – ${formatDate(summary.to)}`
      : formatDate(summary.from);

  const stats = [
    {
      label: "Labour cost",
      value: formatLabourCost(summary.total_labour_cost),
      emphasize: true,
    },
    { label: "Worker days", value: String(summary.total_labour_days) },
    {
      label: "Avg / day",
      value: String(summary.average_workers_per_day),
    },
    { label: "Present", value: String(summary.present_days) },
    { label: "Half day", value: String(summary.half_day_days) },
    { label: "Absent", value: String(summary.absent_days) },
  ];

  return (
    <CompactPanel
      title={title}
      action={
        <span className="text-[11px] text-stone-500">{rangeLabel}</span>
      }
      toolbar={<LabourDateFilters compact />}
    >
      <dl className="grid grid-cols-3 gap-1.5 text-[11px] sm:grid-cols-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={
              stat.emphasize
                ? "rounded-md bg-amber-50 px-2 py-1.5 ring-1 ring-amber-100"
                : "rounded-md bg-stone-50 px-2 py-1.5"
            }
          >
            <dt className="truncate text-stone-500">{stat.label}</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums text-stone-900">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[11px] font-medium tracking-wide text-stone-500 uppercase">
          Top roles
        </span>
        {summary.top_roles.length === 0 ? (
          <span className="text-[11px] text-stone-500">
            No attendance in this range
          </span>
        ) : (
          summary.top_roles.map((role) => (
            <span
              key={role.role}
              className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-2 py-0.5 text-[11px] text-stone-700"
            >
              <span className="font-medium">
                {WORKER_ROLE_PLURAL_LABELS[role.role]}
              </span>
              <span className="tabular-nums text-stone-500">
                {role.labour_days}d · {formatLabourCost(role.labour_cost)}
              </span>
            </span>
          ))
        )}
      </div>
    </CompactPanel>
  );
}
