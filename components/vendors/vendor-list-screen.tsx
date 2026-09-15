"use client";

import { VendorList } from "@/components/vendors/vendor-list";
import { VendorListSkeleton } from "@/components/vendors/vendor-skeletons";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DEFAULT_PAGE_SIZE } from "@/lib/api/pagination";
import { requestJson } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { VendorListItem } from "@/lib/vendors/types";
import { Building2, FilterX, Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { WithIcon } from "@/components/ui/with-icon";

type VendorListResponse = {
  vendors: VendorListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function VendorListScreen() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = searchParams.get("page") ?? "1";
  const pageSize = searchParams.get("page_size") ?? String(DEFAULT_PAGE_SIZE);
  const [result, setResult] = useState<VendorListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (status) params.set("status", status);
    params.set("page", page);
    params.set("page_size", pageSize);

    async function load() {
      setIsLoading(true);
      setError(null);
      const response = await requestJson<VendorListResponse>(
        `/api/vendors?${params.toString()}`,
      );
      if (cancelled) return;
      if (!response.ok) {
        setError(response.message);
        setResult(null);
        setIsLoading(false);
        return;
      }
      setResult(response.data);
      setIsLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [query, status, page, pageSize]);

  if (isLoading) return <VendorListSkeleton />;
  if (error) return <Alert variant="error">{error}</Alert>;

  const vendors = result?.vendors ?? [];
  const total = result?.total ?? 0;
  const hasActiveFilters = Boolean(query || status);

  if (!total) {
    return (
      <EmptyState
        icon={Building2}
        title={hasActiveFilters ? "No matching vendors" : "No vendors added yet."}
        description={
          hasActiveFilters
            ? "Try a different search or status filter."
            : "Add suppliers so you can record material purchases against them."
        }
        action={
          hasActiveFilters ? (
            <Link href="/vendors" className={cn(linkButtonClassName("secondary"))}>
              <WithIcon icon={FilterX}>Clear filters</WithIcon>
            </Link>
          ) : (
            <Link href="/vendors/new" className={cn(linkButtonClassName())}>
              <WithIcon icon={Plus}>Add vendor</WithIcon>
            </Link>
          )
        }
      />
    );
  }

  return (
    <VendorList
      vendors={vendors}
      pagination={{
        page: result?.page ?? 1,
        pageSize: result?.pageSize ?? DEFAULT_PAGE_SIZE,
        total,
        totalPages: result?.totalPages ?? 1,
      }}
    />
  );
}
