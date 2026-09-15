"use client";

import { Input } from "@/components/ui/input";
import { useDebouncedSearchQuery } from "@/hooks/use-debounced-search-query";
import { useSearchParams } from "next/navigation";
import type { FormEvent } from "react";

export function DailyReportFilters() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const archived = searchParams.get("archived") === "1";
  const { value, setValue, applySearch, applyFilters } =
    useDebouncedSearchQuery();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applySearch();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 lg:flex-row lg:items-end"
    >
      <div className="min-w-0 flex-1">
        <label htmlFor="report-search" className="sr-only">
          Search reports
        </label>
        <Input
          id="report-search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search work, issues, or weather"
          className="h-12 text-base lg:h-10 lg:text-sm"
        />
      </div>
      <div className="w-full lg:w-44">
        <label
          htmlFor="report-from"
          className="mb-1.5 block text-sm text-stone-600"
        >
          From
        </label>
        <Input
          id="report-from"
          type="date"
          value={from}
          className="h-12 text-base lg:h-10 lg:text-sm"
          onChange={(event) => {
            const nextFrom = event.target.value;
            applyFilters((params) => {
              if (nextFrom) {
                params.set("from", nextFrom);
              } else {
                params.delete("from");
              }
            });
          }}
        />
      </div>
      <div className="w-full lg:w-44">
        <label
          htmlFor="report-to"
          className="mb-1.5 block text-sm text-stone-600"
        >
          To
        </label>
        <Input
          id="report-to"
          type="date"
          value={to}
          className="h-12 text-base lg:h-10 lg:text-sm"
          onChange={(event) => {
            const nextTo = event.target.value;
            applyFilters((params) => {
              if (nextTo) {
                params.set("to", nextTo);
              } else {
                params.delete("to");
              }
            });
          }}
        />
      </div>
      <label className="flex h-12 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-700 lg:h-10">
        <input
          type="checkbox"
          checked={archived}
          className="h-4 w-4 accent-amber-600"
          onChange={(event) => {
            const nextArchived = event.target.checked;
            applyFilters((params) => {
              if (nextArchived) {
                params.set("archived", "1");
              } else {
                params.delete("archived");
              }
            });
          }}
        />
        View archived
      </label>
    </form>
  );
}
