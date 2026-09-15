import { formatLabourCost } from "@/lib/labour/money";
import { moneyToPaise } from "@/lib/costs/calculations";
import {
  formatVariancePercent,
  varianceLabel,
} from "@/lib/quotations/calculations";
import type { EstimateVsActual, EstimateVsActualLine } from "@/lib/quotations/types";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const ROWS: Array<{ key: keyof EstimateVsActual; label: string; color: string }> =
  [
    { key: "total", label: "Total", color: "#d97706" },
    { key: "labour", label: "Labour", color: "#d97706" },
    { key: "materials", label: "Materials", color: "#0ea5e9" },
    { key: "other", label: "Other", color: "#ea580c" },
  ];

function ComparisonBar({
  label,
  line,
  color,
  emphasize = false,
}: {
  label: string;
  line: EstimateVsActualLine;
  color: string;
  emphasize?: boolean;
}) {
  const estimated = moneyToPaise(line.estimated);
  const actual = moneyToPaise(line.actual);
  const max = Math.max(estimated, actual, 1);
  const estimatedPct = Math.min(100, (estimated / max) * 100);
  const actualPct = Math.min(100, (actual / max) * 100);
  const over = line.over_estimate;

  return (
    <div
      className={cn(
        "rounded-lg px-3 py-2.5",
        emphasize ? "bg-amber-50/80 ring-1 ring-amber-100" : "bg-stone-50",
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p
          className={cn(
            "text-xs font-medium",
            emphasize ? "text-stone-900" : "text-stone-700",
          )}
        >
          {label}
        </p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            over
              ? "bg-red-100 text-red-700"
              : actual > 0
                ? "bg-emerald-100 text-emerald-800"
                : "bg-stone-100 text-stone-500",
          )}
        >
          {actual <= 0 && estimated <= 0
            ? "No spend yet"
            : over && line.variance_percentage != null
              ? `Over by ${formatVariancePercent(Math.max(0, line.variance_percentage - 100))}`
              : line.variance_percentage != null
                ? varianceLabel(line)
                : "On estimate"}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[10px] text-stone-500">Quote</span>
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-stone-200/80">
            <div
              className="h-full rounded-full bg-stone-400"
              style={{ width: `${estimatedPct}%` }}
            />
          </div>
          <span className="w-[4.75rem] shrink-0 text-right text-[11px] tabular-nums text-stone-600">
            {formatLabourCost(line.estimated)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-[10px] text-stone-500">Spent</span>
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-stone-200/80">
            <div
              className="h-full rounded-full"
              style={{
                width: `${actualPct}%`,
                backgroundColor: over ? "#dc2626" : color,
              }}
            />
          </div>
          <span
            className={cn(
              "w-[4.75rem] shrink-0 text-right text-[11px] font-medium tabular-nums",
              over ? "text-red-700" : "text-stone-800",
            )}
          >
            {formatLabourCost(line.actual)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function EstimateVsActualCard({
  quotationNumber,
  comparison,
  compact = false,
  action,
}: {
  quotationNumber?: string;
  comparison: EstimateVsActual;
  compact?: boolean;
  action?: ReactNode;
}) {
  const total = comparison.total;
  const estimated = moneyToPaise(total.estimated);
  const actual = moneyToPaise(total.actual);
  const max = Math.max(estimated, actual, 1);
  const savedOrOver = actual - estimated;

  return (
    <div
      className={cn(
        "rounded-xl border border-stone-200 bg-white shadow-sm",
        compact ? "p-3 sm:p-4" : "p-5",
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-stone-900">
            Quote vs spending
          </h3>
          <p className="mt-0.5 text-xs text-stone-500">
            {quotationNumber ? (
              <>
                Accepted quote{" "}
                <span className="font-medium text-stone-700">
                  {quotationNumber}
                </span>
              </>
            ) : (
              "Quoted amount compared with what you have spent"
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          {action}
          <div className="text-left sm:text-right">
            <p
              className={cn(
                "text-sm font-semibold tabular-nums",
                savedOrOver > 0 ? "text-red-700" : "text-emerald-700",
              )}
            >
              {savedOrOver === 0
                ? "Matching quote"
                : savedOrOver > 0
                  ? `${formatLabourCost(savedOrOver / 100)} over`
                  : `${formatLabourCost(Math.abs(savedOrOver) / 100)} under`}
            </p>
            {total.variance_percentage != null ? (
              <p className="text-[11px] text-stone-500">
                Spending is {formatVariancePercent(total.variance_percentage)} of
                quote
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Total visual */}
      <div className="mt-3 rounded-lg bg-stone-50 p-3">
        <div className="mb-2 flex items-end justify-between gap-2 text-xs">
          <div>
            <p className="text-stone-500">Quoted</p>
            <p className="font-semibold tabular-nums text-stone-900">
              {formatLabourCost(total.estimated)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-stone-500">Spent</p>
            <p
              className={cn(
                "font-semibold tabular-nums",
                total.over_estimate ? "text-red-700" : "text-stone-900",
              )}
            >
              {formatLabourCost(total.actual)}
            </p>
          </div>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full bg-stone-200">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-stone-400/80"
            style={{ width: `${(estimated / max) * 100}%` }}
          />
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              total.over_estimate ? "bg-red-500" : "bg-amber-600",
            )}
            style={{
              width: `${(actual / max) * 100}%`,
              opacity: 0.9,
            }}
          />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-3 text-[10px] text-stone-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
            Quoted
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                total.over_estimate ? "bg-red-500" : "bg-amber-600",
              )}
            />
            Spent
          </span>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {ROWS.filter((row) => row.key !== "total").map((row) => (
          <ComparisonBar
            key={row.key}
            label={row.label}
            line={comparison[row.key]}
            color={row.color}
          />
        ))}
      </div>
    </div>
  );
}
