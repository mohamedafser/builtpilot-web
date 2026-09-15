"use client";

import { VENDOR_STATUS_LABELS, VENDOR_STATUSES } from "@/constants/vendor";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useDebouncedSearchQuery } from "@/hooks/use-debounced-search-query";
import { useSearchParams } from "next/navigation";
import type { FormEvent } from "react";

export function VendorFilters() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "";
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
        <label htmlFor="vendor-search" className="sr-only">
          Search vendors
        </label>
        <Input
          id="vendor-search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search by name, contact, or phone"
          className="h-12 text-base lg:h-10 lg:text-sm"
        />
      </div>
      <div className="w-full lg:w-44">
        <label htmlFor="vendor-status" className="sr-only">
          Filter by status
        </label>
        <Select
          id="vendor-status"
          value={status}
          className="h-12 text-base lg:h-10 lg:text-sm"
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
          {VENDOR_STATUSES.map((item) => (
            <option key={item} value={item}>
              {VENDOR_STATUS_LABELS[item]}
            </option>
          ))}
        </Select>
      </div>
    </form>
  );
}
