import {
  BOQ_STATUS_LABELS,
  BOQ_STATUSES,
} from "@/constants/boq";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useDebouncedSearchQuery } from "@/hooks/use-debounced-search-query";
import { useSearchParams } from "next/navigation";
import type { FormEvent } from "react";

export function BoqFilters() {
  const searchParams = useSearchParams();
  const { value, setValue, applySearch, applyFilters } =
    useDebouncedSearchQuery();
  const status = searchParams.get("status") ?? "all";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applySearch();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end"
    >
      <div className="min-w-0 flex-1 lg:min-w-56">
        <label htmlFor="boq-search" className="sr-only">
          Search BOQs
        </label>
        <Input
          id="boq-search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search BOQ name"
          className="h-12 text-base lg:h-10 lg:text-sm"
        />
      </div>
      <Select
        aria-label="Filter by status"
        value={status}
        onChange={(event) => {
          applyFilters((params) => {
            if (event.target.value === "all") {
              params.delete("status");
            } else {
              params.set("status", event.target.value);
            }
          });
        }}
        className="h-12 text-base lg:h-10 lg:w-44 lg:text-sm"
      >
        <option value="all">All statuses</option>
        {BOQ_STATUSES.map((item) => (
          <option key={item} value={item}>
            {BOQ_STATUS_LABELS[item]}
          </option>
        ))}
      </Select>
    </form>
  );
}
