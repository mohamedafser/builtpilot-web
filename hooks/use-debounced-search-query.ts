"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const SEARCH_DEBOUNCE_MS = 400;

export function useDebouncedSearchQuery(delay = SEARCH_DEBOUNCE_MS) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [value, setValue] = useState(urlQuery);
  const lastAppliedQuery = useRef(urlQuery);

  useEffect(() => {
    if (urlQuery === lastAppliedQuery.current) {
      return;
    }

    setValue(urlQuery);
    lastAppliedQuery.current = urlQuery;
  }, [urlQuery]);

  const replaceParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      mutate(params);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const writeQueryParam = useCallback(
    (params: URLSearchParams, next: string) => {
      const trimmed = next.trim();
      lastAppliedQuery.current = trimmed;

      if (trimmed) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }
    },
    [],
  );

  const applySearch = useCallback(
    (next = value) => {
      const trimmed = next.trim();
      const current = (searchParams.get("q") ?? "").trim();

      if (trimmed === current) {
        lastAppliedQuery.current = trimmed;
        return;
      }

      replaceParams((params) => {
        writeQueryParam(params, next);
      });
    },
    [replaceParams, searchParams, value, writeQueryParam],
  );

  const applyFilters = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      replaceParams((params) => {
        writeQueryParam(params, value);
        mutate(params);
      });
    },
    [replaceParams, value, writeQueryParam],
  );

  useEffect(() => {
    if (value.trim() === urlQuery.trim()) {
      return;
    }

    const timeout = window.setTimeout(() => {
      applySearch(value);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [applySearch, delay, urlQuery, value]);

  return { value, setValue, applySearch, applyFilters };
}
