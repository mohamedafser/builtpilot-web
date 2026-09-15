"use client";

import {
  LABOUR_DATE_PRESET_LABELS,
  LABOUR_DATE_PRESETS,
  type LabourDatePreset,
  isLabourDatePreset,
} from "@/constants/worker";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  shiftIsoDate,
  startOfMonthIso,
  startOfWeekIso,
  todayIsoDate,
} from "@/lib/labour/money";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function rangeForPreset(preset: LabourDatePreset): { from: string; to: string } {
  const today = todayIsoDate();

  if (preset === "yesterday") {
    const yesterday = shiftIsoDate(today, -1);
    return { from: yesterday, to: yesterday };
  }

  if (preset === "this_week") {
    return { from: startOfWeekIso(today), to: today };
  }

  if (preset === "this_month") {
    return { from: startOfMonthIso(today), to: today };
  }

  if (preset === "custom") {
    return { from: today, to: today };
  }

  return { from: today, to: today };
}

export function LabourDateFilters({
  compact = false,
}: {
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const preset = isLabourDatePreset(searchParams.get("preset") ?? "")
    ? (searchParams.get("preset") as LabourDatePreset)
    : "this_month";
  const from = searchParams.get("from") ?? rangeForPreset(preset).from;
  const to = searchParams.get("to") ?? rangeForPreset(preset).to;

  function replaceParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div
      className={
        compact
          ? "flex flex-wrap items-end gap-2"
          : "flex flex-col gap-3 lg:flex-row lg:items-end"
      }
    >
      <div className={compact ? "min-w-[8.5rem] flex-1 sm:flex-none sm:w-40" : "w-full lg:w-48"}>
        <label
          htmlFor="labour-preset"
          className={
            compact
              ? "mb-1 block text-[11px] font-medium text-stone-500"
              : "mb-1.5 block text-sm text-stone-600"
          }
        >
          Range
        </label>
        <Select
          id="labour-preset"
          value={preset}
          className={compact ? "h-9 text-sm" : "h-12 text-base lg:h-10 lg:text-sm"}
          onChange={(event) => {
            const next = event.target.value as LabourDatePreset;
            const range = rangeForPreset(next);
            replaceParams((params) => {
              params.set("preset", next);
              if (next === "custom") {
                params.set("from", from);
                params.set("to", to);
              } else {
                params.set("from", range.from);
                params.set("to", range.to);
              }
            });
          }}
        >
          {LABOUR_DATE_PRESETS.map((value) => (
            <option key={value} value={value}>
              {LABOUR_DATE_PRESET_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>
      {preset === "custom" ? (
        <>
          <div className={compact ? "min-w-[8.5rem] flex-1 sm:flex-none sm:w-36" : "w-full lg:w-44"}>
            <label
              htmlFor="labour-from"
              className={
                compact
                  ? "mb-1 block text-[11px] font-medium text-stone-500"
                  : "mb-1.5 block text-sm text-stone-600"
              }
            >
              From
            </label>
            <Input
              id="labour-from"
              type="date"
              value={from}
              className={compact ? "h-9 text-sm" : "h-12 text-base lg:h-10 lg:text-sm"}
              onChange={(event) => {
                const nextFrom = event.target.value;
                replaceParams((params) => {
                  params.set("preset", "custom");
                  if (nextFrom) {
                    params.set("from", nextFrom);
                  } else {
                    params.delete("from");
                  }
                });
              }}
            />
          </div>
          <div className={compact ? "min-w-[8.5rem] flex-1 sm:flex-none sm:w-36" : "w-full lg:w-44"}>
            <label
              htmlFor="labour-to"
              className={
                compact
                  ? "mb-1 block text-[11px] font-medium text-stone-500"
                  : "mb-1.5 block text-sm text-stone-600"
              }
            >
              To
            </label>
            <Input
              id="labour-to"
              type="date"
              value={to}
              className={compact ? "h-9 text-sm" : "h-12 text-base lg:h-10 lg:text-sm"}
              onChange={(event) => {
                const nextTo = event.target.value;
                replaceParams((params) => {
                  params.set("preset", "custom");
                  if (nextTo) {
                    params.set("to", nextTo);
                  } else {
                    params.delete("to");
                  }
                });
              }}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
