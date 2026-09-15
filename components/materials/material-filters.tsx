"use client";

import {
  MATERIAL_CATEGORIES,
  MATERIAL_CATEGORY_LABELS,
  MATERIAL_STATUS_LABELS,
  MATERIAL_STATUSES,
} from "@/constants/material";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useDebouncedSearchQuery } from "@/hooks/use-debounced-search-query";
import { useSearchParams } from "next/navigation";
import type { FormEvent } from "react";

export function MaterialFilters() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "";
  const category = searchParams.get("category") ?? "";
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
        <label htmlFor="material-search" className="sr-only">
          Search materials
        </label>
        <Input
          id="material-search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search materials"
          className="h-9 text-sm"
        />
      </div>
      <div className="w-full sm:w-40">
        <label htmlFor="material-category" className="sr-only">
          Filter by category
        </label>
        <Select
          id="material-category"
          value={category}
          className="h-9 text-sm"
          onChange={(event) => {
            const next = event.target.value;
            applyFilters((params) => {
              if (next) {
                params.set("category", next);
              } else {
                params.delete("category");
              }
            });
          }}
        >
          <option value="">All categories</option>
          {MATERIAL_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {MATERIAL_CATEGORY_LABELS[item]}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-full sm:w-36">
        <label htmlFor="material-status" className="sr-only">
          Filter by status
        </label>
        <Select
          id="material-status"
          value={status}
          className="h-9 text-sm"
          onChange={(event) => {
            const next = event.target.value;
            applyFilters((params) => {
              if (next) {
                params.set("status", next);
              } else {
                params.delete("status");
              }
            });
          }}
        >
          <option value="">All statuses</option>
          {MATERIAL_STATUSES.map((item) => (
            <option key={item} value={item}>
              {MATERIAL_STATUS_LABELS[item]}
            </option>
          ))}
        </Select>
      </div>
    </form>
  );
}
