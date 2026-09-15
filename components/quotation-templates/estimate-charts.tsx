"use client";

import { formatLabourCost } from "@/lib/labour/money";
import type { EstimateResult } from "@/lib/quotation-templates/calculations";
import { cn } from "@/lib/utils";

export function EstimateSummaryCards({
  estimate,
  currencyCode,
}: {
  estimate: EstimateResult;
  currencyCode: string;
}) {
  const cards = [
    {
      label: "Total area",
      value: `${estimate.totalBuiltUpArea.toLocaleString()} sq.ft`,
      hint: estimate.isEstimateOnly ? "Using plot area" : "Built-up area",
    },
    {
      label: "Construction",
      value: formatLabourCost(estimate.constructionCost, currencyCode),
      tone: "accent" as const,
    },
    {
      label: "Materials",
      value: formatLabourCost(estimate.materialCost, currencyCode),
    },
    {
      label: "Labour",
      value: formatLabourCost(estimate.labourCost, currencyCode),
    },
    {
      label: "Add-ons",
      value: formatLabourCost(estimate.addonCost, currencyCode),
    },
    {
      label: "Grand total",
      value: formatLabourCost(estimate.grandTotal, currencyCode),
      tone: "good" as const,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className={cn(
            "rounded-lg border px-3 py-2",
            card.tone === "accent" && "border-amber-200 bg-amber-50/70",
            card.tone === "good" && "border-emerald-200 bg-emerald-50/60",
            !card.tone && "border-stone-200 bg-white",
          )}
        >
          <dt className="text-[11px] font-medium tracking-wide text-stone-500 uppercase">
            {card.label}
          </dt>
          <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums text-stone-900 sm:text-base">
            {card.value}
          </dd>
          {"hint" in card && card.hint ? (
            <p className="mt-0.5 text-[11px] text-stone-500">{card.hint}</p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

export function CostDistributionChart({
  estimate,
  pricingMode,
  currencyCode,
}: {
  estimate: EstimateResult;
  pricingMode: "turnkey" | "itemized";
  currencyCode: string;
}) {
  const slices =
    pricingMode === "itemized"
      ? [
          { label: "Construction", value: estimate.constructionCost, color: "#d97706" },
          { label: "Materials", value: estimate.materialCost, color: "#0ea5e9" },
          { label: "Labour", value: estimate.labourCost, color: "#059669" },
          { label: "Other", value: estimate.otherCost, color: "#78716c" },
          { label: "Add-ons", value: estimate.addonCost, color: "#a855f7" },
        ]
      : [
          { label: "Construction", value: estimate.constructionCost, color: "#d97706" },
          { label: "Add-ons", value: estimate.addonCost, color: "#a855f7" },
          { label: "Contingency", value: estimate.contingencyAmount, color: "#78716c" },
        ];

  const total = Math.max(
    slices.reduce((sum, slice) => sum + slice.value, 0),
    1,
  );

  let offset = 0;
  const size = 140;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative mx-auto shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f5f5f4"
            strokeWidth={stroke}
          />
          {slices.map((slice) => {
            if (slice.value <= 0) return null;
            const length = (slice.value / total) * circumference;
            const circle = (
              <circle
                key={slice.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={stroke}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
            offset += length;
            return circle;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-sm font-semibold tabular-nums text-stone-900">
            {formatLabourCost(estimate.grandTotal, currencyCode)}
          </p>
          <p className="text-[10px] text-stone-500">total</p>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {slices.map((slice) => (
          <li
            key={slice.label}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <span className="inline-flex items-center gap-1.5 text-stone-600">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: slice.color }}
                aria-hidden
              />
              {slice.label}
            </span>
            <span className="font-medium tabular-nums text-stone-800">
              {formatLabourCost(slice.value, currencyCode)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FloorCostChart({
  estimate,
  currencyCode,
}: {
  estimate: EstimateResult;
  currencyCode: string;
}) {
  const max = Math.max(...estimate.floorCosts.map((floor) => floor.amount), 1);

  return (
    <div className="space-y-2">
      {estimate.floorCosts.map((floor) => {
        const width = Math.max(4, (floor.amount / max) * 100);
        return (
          <div key={floor.floor}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-stone-700">{floor.name}</span>
              <span className="tabular-nums text-stone-600">
                {floor.areaSqFt} × {floor.ratePerSqFt} ={" "}
                {formatLabourCost(floor.amount, currencyCode)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-amber-500"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
