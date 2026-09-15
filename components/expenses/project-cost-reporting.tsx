"use client";

import {
  CompactPanel,
  CompactStatStrip,
} from "@/components/projects/project-section-chrome";
import { MonthlySpendChart } from "@/components/projects/project-visuals";
import {
  COST_PERIOD_PRESET_LABELS,
  COST_PERIOD_PRESETS,
  type CostPeriodPreset,
  isCostPeriodPreset,
} from "@/constants/expense";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/use-api-data";
import { moneyToPaise } from "@/lib/costs/calculations";
import type { ProjectCostDashboard } from "@/lib/costs/types";
import {
  endOfMonthIso,
  formatLabourCost,
  startOfMonthIso,
  startOfPreviousMonthIso,
  todayIsoDate,
} from "@/lib/labour/money";
import { formatDate } from "@/lib/utils";
import { useMemo, useState } from "react";

function rangeForPreset(preset: CostPeriodPreset): { from: string; to: string } {
  const today = todayIsoDate();

  if (preset === "last_month") {
    const from = startOfPreviousMonthIso(today);
    return { from, to: endOfMonthIso(from) };
  }

  if (preset === "custom") {
    return { from: startOfMonthIso(today), to: today };
  }

  return { from: startOfMonthIso(today), to: today };
}

function shortMonthLabel(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "2-digit",
  }).format(date);
}

export function ProjectCostReporting({ projectId }: { projectId: string }) {
  const [preset, setPreset] = useState<CostPeriodPreset>("this_month");
  const [customFrom, setCustomFrom] = useState(rangeForPreset("custom").from);
  const [customTo, setCustomTo] = useState(rangeForPreset("custom").to);
  const range = useMemo(() => {
    if (preset === "custom") {
      return { from: customFrom, to: customTo };
    }

    return rangeForPreset(preset);
  }, [customFrom, customTo, preset]);

  const { data, error, isLoading } = useApiData<ProjectCostDashboard>(
    `/api/projects/${projectId}/cost?from=${range.from}&to=${range.to}`,
  );

  const maxCategory = Math.max(
    1,
    ...(data?.categories.map((row) => moneyToPaise(row.amount)) ?? [1]),
  );

  const trendMonths =
    data?.trend.map((row) => ({
      label: shortMonthLabel(row.month_start),
      total: moneyToPaise(row.total_cost) / 100,
    })) ?? [];

  return (
    <div className="space-y-3">
      <CompactPanel
        title="Monthly project cost"
        action={
          <p className="text-[11px] text-stone-500">
            {formatDate(range.from)}
            {range.from !== range.to ? ` – ${formatDate(range.to)}` : ""}
          </p>
        }
      >
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="w-full sm:w-40">
            <label
              htmlFor="cost-preset"
              className="mb-1 block text-[11px] font-medium text-stone-500"
            >
              Period
            </label>
            <Select
              id="cost-preset"
              value={preset}
              className="h-9 text-sm"
              onChange={(event) => {
                const next = event.target.value;
                if (isCostPeriodPreset(next)) {
                  setPreset(next);
                }
              }}
            >
              {COST_PERIOD_PRESETS.map((value) => (
                <option key={value} value={value}>
                  {COST_PERIOD_PRESET_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
          {preset === "custom" ? (
            <>
              <div className="w-full sm:w-36">
                <label
                  htmlFor="cost-from"
                  className="mb-1 block text-[11px] font-medium text-stone-500"
                >
                  From
                </label>
                <Input
                  id="cost-from"
                  type="date"
                  value={customFrom}
                  className="h-9 text-sm"
                  onChange={(event) => setCustomFrom(event.target.value)}
                />
              </div>
              <div className="w-full sm:w-36">
                <label
                  htmlFor="cost-to"
                  className="mb-1 block text-[11px] font-medium text-stone-500"
                >
                  To
                </label>
                <Input
                  id="cost-to"
                  type="date"
                  value={customTo}
                  className="h-9 text-sm"
                  onChange={(event) => setCustomTo(event.target.value)}
                />
              </div>
            </>
          ) : null}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        ) : error ? (
          <Alert variant="error">{error}</Alert>
        ) : data ? (
          <CompactStatStrip
            stats={[
              {
                label: "Labour",
                value: formatLabourCost(data.monthly.labour_cost),
              },
              {
                label: "Materials",
                value: formatLabourCost(data.monthly.material_cost),
              },
              {
                label: "Other",
                value: formatLabourCost(data.monthly.other_expenses),
              },
              {
                label: "Total",
                value: formatLabourCost(data.monthly.total_cost),
                tone: "accent",
              },
            ]}
          />
        ) : null}
      </CompactPanel>

      <div className="grid gap-3 xl:grid-cols-2">
        <CompactPanel title="Expense categories">
          {isLoading ? (
            <Skeleton className="h-28 rounded-lg" />
          ) : !data || data.categories.length === 0 ? (
            <p className="text-xs text-stone-500">
              No other expenses recorded for this period.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.categories.map((row) => {
                const width = Math.max(
                  4,
                  Math.round((moneyToPaise(row.amount) / maxCategory) * 100),
                );
                return (
                  <li key={row.category}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-medium text-stone-800">
                        {row.label}
                      </span>
                      <span className="shrink-0 tabular-nums text-stone-500">
                        {formatLabourCost(row.amount)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-amber-500/90"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CompactPanel>

        <CompactPanel title="Cost trend">
          {isLoading ? (
            <Skeleton className="h-28 rounded-lg" />
          ) : (
            <MonthlySpendChart months={trendMonths} />
          )}
        </CompactPanel>
      </div>
    </div>
  );
}
