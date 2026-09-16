"use client";

import {
  formatMaterialCost,
  formatQuantityWithUnit,
} from "@/lib/materials/stock";
import type {
  MaterialProjectUsage,
  MaterialTransactionListItem,
} from "@/lib/materials/types";
import type { MaterialUnit } from "@/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

function toQty(value: string | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function StockFlowDonut({
  current,
  used,
  returned,
  unit,
}: {
  current: number;
  used: number;
  returned: number;
  unit: MaterialUnit;
}) {
  const segments = [
    { label: "On hand", value: current, color: "#d97706" },
    { label: "Used", value: used, color: "#0ea5e9" },
    { label: "Returned", value: returned, color: "#78716c" },
  ];
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const size = 96;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const visible = segments.filter((s) => s.value > 0);

  if (total <= 0) {
    return (
      <p className="text-xs text-stone-500">
        Stock movement will chart here after receive / use.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label="Stock flow"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f5f5f4"
            strokeWidth={stroke}
          />
          {visible.map((segment) => {
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
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
          <p className="text-[11px] font-semibold leading-tight text-stone-900 tabular-nums">
            {formatQuantityWithUnit(String(current), unit)}
          </p>
          <p className="text-[9px] text-stone-500">on hand</p>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1">
        {segments.map((segment) => {
          const percent =
            total > 0 ? Math.round((segment.value / total) * 100) : 0;
          return (
            <li
              key={segment.label}
              className="flex items-center justify-between gap-2 text-[11px]"
            >
              <span className="inline-flex items-center gap-1.5 text-stone-600">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: segment.color }}
                  aria-hidden
                />
                {segment.label}
              </span>
              <span className="tabular-nums text-stone-800">
                {percent}%
                <span className="ml-1 text-stone-400">
                  {formatQuantityWithUnit(String(segment.value), unit)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ProjectUsageBars({
  projects,
  unit,
}: {
  projects: MaterialProjectUsage[];
  unit: MaterialUnit;
}) {
  if (projects.length === 0) {
    return (
      <p className="text-xs text-stone-500">
        Assign to a project to see stock by site.
      </p>
    );
  }

  const rows = [...projects]
    .map((row) => ({
      ...row,
      stock: toQty(row.current_stock),
      used: toQty(row.total_used),
    }))
    .sort((a, b) => b.stock + b.used - (a.stock + a.used))
    .slice(0, 6);

  const max = Math.max(...rows.map((r) => r.stock + r.used), 1);

  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const stockPct = (row.stock / max) * 100;
        const usedPct = (row.used / max) * 100;
        return (
          <li key={row.project_id} className="min-w-0">
            <div className="mb-0.5 flex items-center justify-between gap-2">
              <Link
                href={`/projects/${row.project_id}/materials`}
                className="truncate text-[11px] font-medium text-stone-800 hover:text-amber-700"
              >
                {row.project_name}
              </Link>
              <span className="shrink-0 text-[10px] tabular-nums text-stone-500">
                {formatQuantityWithUnit(String(row.stock), unit)}
              </span>
            </div>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full bg-amber-500/90"
                style={{ width: `${stockPct}%` }}
                title={`On hand: ${formatQuantityWithUnit(String(row.stock), unit)}`}
              />
              <div
                className="h-full bg-sky-500/80"
                style={{ width: `${usedPct}%` }}
                title={`Used: ${formatQuantityWithUnit(String(row.used), unit)}`}
              />
            </div>
          </li>
        );
      })}
      <li className="flex items-center gap-3 pt-0.5 text-[10px] text-stone-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
          On hand
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden />
          Used
        </span>
      </li>
    </ul>
  );
}

function ActivityBars({
  transactions,
  unit,
}: {
  transactions: MaterialTransactionListItem[];
  unit: MaterialUnit;
}) {
  if (transactions.length === 0) {
    return (
      <p className="text-xs text-stone-500">
        Recent receive / use activity will appear here.
      </p>
    );
  }

  const typeMeta: Record<
    string,
    { label: string; color: string; sign: 1 | -1 }
  > = {
    received: { label: "Received", color: "#059669", sign: 1 },
    used: { label: "Used", color: "#0ea5e9", sign: -1 },
    returned: { label: "Returned", color: "#78716c", sign: 1 },
    adjusted: { label: "Adjusted", color: "#d97706", sign: 1 },
  };

  const byType = new Map<string, number>();
  for (const row of transactions) {
    const key = row.transaction_type;
    let qty = toQty(row.quantity);
    if (
      key === "adjusted" &&
      row.adjustment_direction === "decrease"
    ) {
      qty = -qty;
    }
    byType.set(key, (byType.get(key) ?? 0) + Math.abs(qty));
  }

  const bars = Object.entries(typeMeta)
    .map(([key, meta]) => ({
      key,
      ...meta,
      value: byType.get(key) ?? 0,
    }))
    .filter((bar) => bar.value > 0);

  if (bars.length === 0) {
    return (
      <p className="text-xs text-stone-500">
        Recent receive / use activity will appear here.
      </p>
    );
  }

  const max = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div className="flex h-24 items-end gap-2">
      {bars.map((bar) => {
        const height = Math.max(8, (bar.value / max) * 100);
        return (
          <div
            key={bar.key}
            className="flex min-w-0 flex-1 flex-col items-center gap-1"
          >
            <p className="text-[9px] tabular-nums text-stone-500">
              {formatQuantityWithUnit(String(bar.value), unit)}
            </p>
            <div className="flex h-16 w-full items-end justify-center">
              <div
                className="w-full max-w-7 rounded-t-sm"
                style={{
                  height: `${height}%`,
                  backgroundColor: bar.color,
                }}
                title={`${bar.label}: ${formatQuantityWithUnit(String(bar.value), unit)}`}
              />
            </div>
            <span className="truncate text-[10px] text-stone-500">
              {bar.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function MaterialDetailCharts({
  inventory,
  projectUsage,
  recentTransactions,
  unit,
  purchasedCost,
  usedCost,
  stockValue,
}: {
  inventory: {
    current_stock: string;
    total_received: string;
    total_used: string;
    total_returned: string;
  };
  projectUsage: MaterialProjectUsage[];
  recentTransactions: MaterialTransactionListItem[];
  unit: MaterialUnit;
  purchasedCost: string;
  usedCost: string;
  stockValue: string;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <section className="rounded-lg border border-stone-200 bg-white p-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-semibold text-stone-900">Stock flow</h3>
          <p className="text-[10px] tabular-nums text-stone-500">
            Recv{" "}
            {formatQuantityWithUnit(inventory.total_received, unit)}
          </p>
        </div>
        <StockFlowDonut
          current={toQty(inventory.current_stock)}
          used={toQty(inventory.total_used)}
          returned={toQty(inventory.total_returned)}
          unit={unit}
        />
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-semibold text-stone-900">By project</h3>
          <p className="text-[10px] text-stone-500">
            {projectUsage.length} site{projectUsage.length === 1 ? "" : "s"}
          </p>
        </div>
        <ProjectUsageBars projects={projectUsage} unit={unit} />
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-semibold text-stone-900">
            Recent activity
          </h3>
          <p className="text-[10px] tabular-nums text-stone-500">
            Value {formatMaterialCost(stockValue)}
          </p>
        </div>
        <ActivityBars transactions={recentTransactions} unit={unit} />
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-stone-100 pt-2 text-[10px]">
          <div className="flex justify-between gap-2">
            <dt className="text-stone-500">Purchased</dt>
            <dd className="tabular-nums text-stone-800">
              {formatMaterialCost(purchasedCost)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-stone-500">Used cost</dt>
            <dd className="tabular-nums text-stone-800">
              {formatMaterialCost(usedCost)}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

export function MaterialStatStrip({
  items,
}: {
  items: Array<{ label: string; value: string; tone?: "default" | "warn" }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "bg-white px-3 py-2",
            item.tone === "warn" && "bg-amber-50/80",
          )}
        >
          <p className="text-[10px] uppercase tracking-wide text-stone-500">
            {item.label}
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-stone-900">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
