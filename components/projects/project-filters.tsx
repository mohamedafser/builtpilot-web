"use client";

import { PROJECT_STATUS_LABELS, PROJECT_STATUSES } from "@/constants/project";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useDebouncedSearchQuery } from "@/hooks/use-debounced-search-query";
import { useSearchParams } from "next/navigation";
import type { FormEvent } from "react";

export function ProjectFilters() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "";
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
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <div className="min-w-0 flex-1">
        <label htmlFor="project-search" className="sr-only">
          Search projects
        </label>
        <Input
          id="project-search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search project, client, or location"
          className="h-9 text-sm"
        />
      </div>
      <div className="w-full sm:w-40">
        <label htmlFor="project-status" className="sr-only">
          Filter by status
        </label>
        <Select
          id="project-status"
          value={status}
          className="h-9 text-sm"
          onChange={(event) => {
            const nextStatus = event.target.value;
            applyFilters((params) => {
              if (nextStatus) {
                params.set("status", nextStatus);
              } else {
                params.delete("status");
              }
            });
          }}
        >
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {PROJECT_STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>
      <label className="flex h-9 shrink-0 items-center gap-2 rounded-md border border-stone-300 bg-white px-2.5 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={archived}
          className="h-3.5 w-3.5 accent-amber-600"
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
        Archived
      </label>
    </form>
  );
}
