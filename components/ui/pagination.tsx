"use client";

import { linkButtonClassName } from "@/components/ui/button";
import { WithIcon } from "@/components/ui/with-icon";
import { Select } from "@/components/ui/select";
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  type PaginationMeta,
} from "@/lib/api/pagination";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ChangeEvent } from "react";

function pageNumbers(page: number, totalPages: number): Array<number | "…"> {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | "…"> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) {
    items.push("…");
  }

  for (let current = start; current <= end; current += 1) {
    items.push(current);
  }

  if (end < totalPages - 1) {
    items.push("…");
  }

  items.push(totalPages);
  return items;
}

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
}: PaginationMeta) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  if (total === 0) {
    return null;
  }

  function hrefFor(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());

    if (pageSize === DEFAULT_PAGE_SIZE) {
      params.delete("page_size");
    } else {
      params.set("page_size", String(pageSize));
    }

    if (nextPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function onPageSizeChange(event: ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    const nextSize = Number(event.target.value);

    params.delete("page");

    if (nextSize === DEFAULT_PAGE_SIZE) {
      params.delete("page_size");
    } else {
      params.set("page_size", String(nextSize));
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;
  const showPager = totalPages > 1;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 bg-stone-50 px-3 py-2">
      <div className="flex items-center gap-3">
        <p className="text-xs text-stone-500">
          {from}–{to} of {total}
        </p>
        <label className="flex items-center gap-1.5 text-xs text-stone-600">
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Rows
          </span>
          <Select
            aria-label="Rows per page"
            value={String(pageSize)}
            onChange={onPageSizeChange}
            className="h-8 w-16 px-1.5 text-xs"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </label>
      </div>
      {showPager ? (
        <div className="flex flex-wrap items-center gap-1">
          {canGoPrevious ? (
            <Link
              href={hrefFor(page - 1)}
              className={cn(linkButtonClassName("secondary", "sm"), "h-8 px-2")}
              aria-label="Previous page"
            >
              <WithIcon icon={ChevronLeft}>
                <span className="sr-only sm:not-sr-only">Prev</span>
              </WithIcon>
            </Link>
          ) : (
            <span
              className={cn(
                linkButtonClassName("secondary", "sm"),
                "h-8 px-2 opacity-50",
              )}
              aria-disabled
            >
              <WithIcon icon={ChevronLeft}>
                <span className="sr-only sm:not-sr-only">Prev</span>
              </WithIcon>
            </span>
          )}
          {pageNumbers(page, totalPages).map((item, index) =>
            item === "…" ? (
              <span
                key={`ellipsis-${index}`}
                className="px-1 text-xs text-stone-400"
              >
                …
              </span>
            ) : item === page ? (
              <span
                key={item}
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-stone-900 px-2 text-xs font-medium text-white"
              >
                {item}
              </span>
            ) : (
              <Link
                key={item}
                href={hrefFor(item)}
                className={cn(
                  linkButtonClassName("secondary", "sm"),
                  "h-8 min-w-8 px-2 text-xs",
                )}
              >
                {item}
              </Link>
            ),
          )}
          {canGoNext ? (
            <Link
              href={hrefFor(page + 1)}
              className={cn(linkButtonClassName("secondary", "sm"), "h-8 px-2")}
              aria-label="Next page"
            >
              <WithIcon icon={ChevronRight}>
                <span className="sr-only sm:not-sr-only">Next</span>
              </WithIcon>
            </Link>
          ) : (
            <span
              className={cn(
                linkButtonClassName("secondary", "sm"),
                "h-8 px-2 opacity-50",
              )}
              aria-disabled
            >
              <WithIcon icon={ChevronRight}>
                <span className="sr-only sm:not-sr-only">Next</span>
              </WithIcon>
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
