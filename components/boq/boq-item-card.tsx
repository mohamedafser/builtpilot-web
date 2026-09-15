import { BoqItemTypeBadge } from "@/components/ui/badge";
import { linkButtonClassName } from "@/components/ui/button";
import { BOQ_UNIT_SHORT_LABELS } from "@/constants/boq";
import { formatCompletionPercent } from "@/lib/boq/calculations";
import type { BoqItemProgress } from "@/lib/boq/types";
import { formatLabourCost } from "@/lib/labour/money";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function BoqItemCard({
  projectId,
  boqId,
  item,
  showMeasure = true,
}: {
  projectId: string;
  boqId: string;
  item: BoqItemProgress;
  showMeasure?: boolean;
}) {
  const href = `/projects/${projectId}/boq/${boqId}/items/${item.id}`;
  const percent = item.completion_percentage ?? 0;

  return (
    <article className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {item.item_code ? (
              <span className="text-[10px] font-semibold tracking-[0.12em] text-stone-500 uppercase">
                {item.item_code}
              </span>
            ) : null}
            <BoqItemTypeBadge type={item.item_type} />
          </div>
          <Link
            href={href}
            className="mt-1 block text-sm font-semibold text-stone-900 transition-colors hover:text-amber-700"
          >
            {item.description}
          </Link>
          {item.section_name ? (
            <p className="mt-1 text-[11px] text-stone-500">
              {item.section_name}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-medium text-stone-500">Progress</p>
          <p className="text-sm font-semibold text-stone-900">
            {formatCompletionPercent(item.completion_percentage)}
          </p>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100">
        <div
          className={cn(
            "h-full rounded-full",
            percent >= 100 ? "bg-emerald-500" : "bg-amber-500",
          )}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
        <div className="rounded-lg bg-stone-50 px-2 py-1.5">
          <dt className="text-stone-500">Est.</dt>
          <dd className="mt-0.5 font-semibold text-stone-900">
            {item.estimated_quantity} {BOQ_UNIT_SHORT_LABELS[item.unit]}
          </dd>
          <dd className="mt-0.5 text-stone-500">
            {formatLabourCost(item.estimated_amount)}
          </dd>
        </div>
        <div className="rounded-lg bg-emerald-50 px-2 py-1.5">
          <dt className="text-emerald-700">Done</dt>
          <dd className="mt-0.5 font-semibold text-stone-900">
            {item.completed_quantity} {BOQ_UNIT_SHORT_LABELS[item.unit]}
          </dd>
          <dd className="mt-0.5 text-stone-500">
            {formatLabourCost(item.completed_value)}
          </dd>
        </div>
        <div className="rounded-lg bg-amber-50 px-2 py-1.5">
          <dt className="text-amber-800">Left</dt>
          <dd className="mt-0.5 font-semibold text-stone-900">
            {item.remaining_quantity} {BOQ_UNIT_SHORT_LABELS[item.unit]}
          </dd>
          <dd className="mt-0.5 text-stone-500">
            {formatLabourCost(item.remaining_value)}
          </dd>
        </div>
        <div className="rounded-lg bg-stone-100 px-2 py-1.5">
          <dt className="text-stone-500">Rate</dt>
          <dd className="mt-0.5 font-semibold text-stone-900">
            {formatLabourCost(item.rate)}
          </dd>
          <dd className="mt-0.5 text-stone-500">
            / {BOQ_UNIT_SHORT_LABELS[item.unit]}
          </dd>
        </div>
      </dl>

      {showMeasure ? (
        <Link
          href={href}
          className={cn(
            linkButtonClassName("secondary", "sm"),
            "mt-3 h-8 px-2.5 text-[11px]",
          )}
        >
          Add measurement
        </Link>
      ) : null}
    </article>
  );
}
