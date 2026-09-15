import {
  QUOTATION_DATE_PRESET_LABELS,
  QUOTATION_DATE_PRESETS,
  QUOTATION_STATUS_LABELS,
  QUOTATION_STATUSES,
  type QuotationDatePreset,
  isQuotationDatePreset,
} from "@/constants/quotation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useDebouncedSearchQuery } from "@/hooks/use-debounced-search-query";
import {
  endOfMonthIso,
  startOfMonthIso,
  startOfPreviousMonthIso,
  startOfWeekIso,
  todayIsoDate,
} from "@/lib/labour/money";
import { useSearchParams } from "next/navigation";
import type { FormEvent } from "react";

function rangeForPreset(preset: QuotationDatePreset): { from: string; to: string } {
  const today = todayIsoDate();

  if (preset === "this_week") {
    return { from: startOfWeekIso(today), to: today };
  }

  if (preset === "this_month") {
    return { from: startOfMonthIso(today), to: today };
  }

  if (preset === "last_month") {
    const from = startOfPreviousMonthIso(today);
    return { from, to: endOfMonthIso(from) };
  }

  if (preset === "custom") {
    return { from: today, to: today };
  }

  if (preset === "today") {
    return { from: today, to: today };
  }

  return { from: "", to: "" };
}

export function QuotationFilters() {
  const searchParams = useSearchParams();
  const { value, setValue, applySearch, applyFilters } =
    useDebouncedSearchQuery();
  const preset = isQuotationDatePreset(searchParams.get("preset") ?? "")
    ? (searchParams.get("preset") as QuotationDatePreset)
    : "all";
  const from = searchParams.get("from") ?? rangeForPreset(preset).from;
  const to = searchParams.get("to") ?? rangeForPreset(preset).to;
  const status = searchParams.get("status") ?? "all";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applySearch();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-stone-100 bg-stone-50/80 p-2.5"
    >
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-end">
        <div className="min-w-0 flex-1 lg:min-w-52">
          <label htmlFor="quotation-search" className="sr-only">
            Search quotations
          </label>
          <Input
            id="quotation-search"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Search number, client, or title"
            className="h-9 text-sm"
          />
        </div>
        <div className="min-w-0 lg:w-40">
          <label
            htmlFor="quotation-preset"
            className="mb-1 block text-[11px] font-medium text-stone-500"
          >
            Range
          </label>
          <Select
            id="quotation-preset"
            value={preset}
            className="h-9 text-sm"
            onChange={(event) => {
              const next = event.target.value as QuotationDatePreset;
              const range = rangeForPreset(next);
              applyFilters((params) => {
                params.set("preset", next);
                if (next === "all") {
                  params.delete("from");
                  params.delete("to");
                } else if (next === "custom") {
                  params.set("from", from || todayIsoDate());
                  params.set("to", to || todayIsoDate());
                } else {
                  params.set("from", range.from);
                  params.set("to", range.to);
                }
              });
            }}
          >
            {QUOTATION_DATE_PRESETS.map((value) => (
              <option key={value} value={value}>
                {QUOTATION_DATE_PRESET_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>
        {preset === "custom" ? (
          <>
            <div className="min-w-0 lg:w-36">
              <label
                htmlFor="quotation-from"
                className="mb-1 block text-[11px] font-medium text-stone-500"
              >
                From
              </label>
              <Input
                id="quotation-from"
                type="date"
                value={from}
                className="h-9 text-sm"
                onChange={(event) => {
                  const nextFrom = event.target.value;
                  applyFilters((params) => {
                    params.set("preset", "custom");
                    if (nextFrom) params.set("from", nextFrom);
                    else params.delete("from");
                  });
                }}
              />
            </div>
            <div className="min-w-0 lg:w-36">
              <label
                htmlFor="quotation-to"
                className="mb-1 block text-[11px] font-medium text-stone-500"
              >
                To
              </label>
              <Input
                id="quotation-to"
                type="date"
                value={to}
                className="h-9 text-sm"
                onChange={(event) => {
                  const nextTo = event.target.value;
                  applyFilters((params) => {
                    params.set("preset", "custom");
                    if (nextTo) params.set("to", nextTo);
                    else params.delete("to");
                  });
                }}
              />
            </div>
          </>
        ) : null}
        <div className="min-w-0 lg:w-36">
          <label
            htmlFor="quotation-status"
            className="mb-1 block text-[11px] font-medium text-stone-500"
          >
            Status
          </label>
          <Select
            id="quotation-status"
            value={status}
            className="h-9 text-sm"
            onChange={(event) => {
              const next = event.target.value;
              applyFilters((params) => {
                if (next && next !== "all") params.set("status", next);
                else params.delete("status");
              });
            }}
          >
            <option value="all">All statuses</option>
            {QUOTATION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {QUOTATION_STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </form>
  );
}
