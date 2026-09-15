import {
  CircularProgress,
  StageRail,
  type StageItem,
} from "@/components/projects/project-visuals";
import { formatCompletionPercent } from "@/lib/boq/calculations";
import { formatLabourCost } from "@/lib/labour/money";
import type { BoqSummary, BoqSectionSummary } from "@/lib/boq/types";

function toStages(sections: BoqSectionSummary[]): StageItem[] {
  const seen = new Set<string>();

  return sections
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .filter((section) => {
      if (seen.has(section.id)) {
        return false;
      }

      seen.add(section.id);
      return true;
    })
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

export function BoqSummaryCards({
  summary,
  title,
  sections,
}: {
  summary: BoqSummary;
  title?: string;
  sections?: BoqSectionSummary[];
}) {
  const stages = sections ? toStages(sections) : [];

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
      {title ? (
        <h3 className="mb-2 text-sm font-semibold text-stone-900">{title}</h3>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <CircularProgress
          percent={summary.completion_percentage}
          size={88}
          stroke={8}
          label="done"
          sublabel={`${summary.item_count} item${summary.item_count === 1 ? "" : "s"}`}
        />
        <dl className="grid min-w-0 flex-1 grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg bg-stone-50 px-2.5 py-2">
            <dt className="text-stone-500">Estimated</dt>
            <dd className="mt-0.5 font-semibold text-stone-900 tabular-nums">
              {formatLabourCost(summary.estimated_value)}
            </dd>
          </div>
          <div className="rounded-lg bg-emerald-50 px-2.5 py-2">
            <dt className="text-emerald-700">Completed</dt>
            <dd className="mt-0.5 font-semibold text-stone-900 tabular-nums">
              {formatLabourCost(summary.completed_value)}
            </dd>
            <p className="text-[10px] text-emerald-700">
              {formatCompletionPercent(summary.completion_percentage)}
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 px-2.5 py-2">
            <dt className="text-amber-800">Remaining</dt>
            <dd className="mt-0.5 font-semibold text-stone-900 tabular-nums">
              {formatLabourCost(summary.remaining_value)}
            </dd>
          </div>
        </dl>
      </div>
      {stages.length > 0 ? (
        <div className="mt-3 border-t border-stone-100 pt-3">
          <StageRail stages={stages} />
        </div>
      ) : null}
    </section>
  );
}
