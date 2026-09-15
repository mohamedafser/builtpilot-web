"use client";

import {
  MATERIAL_DATE_PRESET_LABELS,
  MATERIAL_DATE_PRESETS,
  type MaterialDatePreset,
  isMaterialDatePreset,
} from "@/constants/material";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  startOfMonthIso,
  startOfWeekIso,
  todayIsoDate,
} from "@/lib/labour/money";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function rangeForPreset(preset: MaterialDatePreset): { from: string; to: string } {
  const today = todayIsoDate();

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

export function MaterialDateFilters({
  compact = false,
}: {
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const preset = isMaterialDatePreset(searchParams.get("preset") ?? "")
    ? (searchParams.get("preset") as MaterialDatePreset)
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
      <div className={compact ? "min-w-[8.5rem] flex-1 sm:flex-none" : "w-full lg:w-48"}>
        <label
          htmlFor="material-preset"
          className={
            compact
              ? "mb-1 block text-[11px] font-medium text-stone-500"
              : "mb-1.5 block text-sm text-stone-600"
          }
        >
          Range
        </label>
        <Select
          id="material-preset"
          value={preset}
          className={compact ? "h-9 text-sm" : "h-12 text-base lg:h-10 lg:text-sm"}
          onChange={(event) => {
            const next = event.target.value as MaterialDatePreset;
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
          {MATERIAL_DATE_PRESETS.map((value) => (
            <option key={value} value={value}>
              {MATERIAL_DATE_PRESET_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>
      {preset === "custom" ? (
        <>
          <div className={compact ? "min-w-[8.5rem] flex-1 sm:flex-none" : "w-full lg:w-44"}>
            <label
              htmlFor="material-from"
              className={
                compact
                  ? "mb-1 block text-[11px] font-medium text-stone-500"
                  : "mb-1.5 block text-sm text-stone-600"
              }
            >
              From
            </label>
            <Input
              id="material-from"
              type="date"
              value={from}
              className={compact ? "h-9 text-sm" : "h-12 text-base lg:h-10 lg:text-sm"}
              onChange={(event) => {
                const nextFrom = event.target.value;
                replaceParams((params) => {
                  params.set("preset", "custom");
                  if (nextFrom) params.set("from", nextFrom);
                  else params.delete("from");
                });
              }}
            />
          </div>
          <div className={compact ? "min-w-[8.5rem] flex-1 sm:flex-none" : "w-full lg:w-44"}>
            <label
              htmlFor="material-to"
              className={
                compact
                  ? "mb-1 block text-[11px] font-medium text-stone-500"
                  : "mb-1.5 block text-sm text-stone-600"
              }
            >
              To
            </label>
            <Input
              id="material-to"
              type="date"
              value={to}
              className={compact ? "h-9 text-sm" : "h-12 text-base lg:h-10 lg:text-sm"}
              onChange={(event) => {
                const nextTo = event.target.value;
                replaceParams((params) => {
                  params.set("preset", "custom");
                  if (nextTo) params.set("to", nextTo);
                  else params.delete("to");
                });
              }}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
