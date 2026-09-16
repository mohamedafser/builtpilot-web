"use client";

import { Can } from "@/components/permissions/can";
import { MaterialList } from "@/components/materials/material-list";
import { MaterialListSkeleton } from "@/components/materials/material-skeletons";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { WithIcon } from "@/components/ui/with-icon";
import { DEFAULT_PAGE_SIZE } from "@/lib/api/pagination";
import { requestJson } from "@/lib/api/client";
import { useLocale } from "@/lib/i18n/locale-context";
import type { MaterialListItem } from "@/lib/materials/types";
import { cn } from "@/lib/utils";
import { FilterX, Package, Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type MaterialListResponse = {
  materials: MaterialListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function MaterialListScreen() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const category = searchParams.get("category") ?? "";
  const page = searchParams.get("page") ?? "1";
  const pageSize = searchParams.get("page_size") ?? String(DEFAULT_PAGE_SIZE);

  const [result, setResult] = useState<MaterialListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (status) params.set("status", status);
      if (category) params.set("category", category);
      params.set("page", page);
      params.set("page_size", pageSize);

      const materialsResponse = await requestJson<MaterialListResponse>(
        `/api/materials?${params.toString()}`,
      );

      if (cancelled) {
        return;
      }

      if (!materialsResponse.ok) {
        setError(materialsResponse.message);
        setResult(null);
        setIsLoading(false);
        return;
      }

      setResult(materialsResponse.data);
      setIsLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [query, status, category, page, pageSize]);

  if (isLoading) {
    return <MaterialListSkeleton />;
  }

  if (error) {
    return <Alert variant="error">{t("materials.loadError")}</Alert>;
  }

  const materials = result?.materials ?? [];
  const total = result?.total ?? 0;
  const hasActiveFilters = Boolean(query || status || category);

  if (!total || materials.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title={hasActiveFilters ? "No matching materials" : t("materials.empty")}
        description={
          hasActiveFilters
            ? "Try a different search, category, or status filter."
            : t("materials.emptyHint")
        }
        action={
          hasActiveFilters ? (
            <Link
              href="/materials"
              className={cn(linkButtonClassName("secondary"))}
            >
              <WithIcon icon={FilterX}>{t("common.clearFilters")}</WithIcon>
            </Link>
          ) : (
            <Can permission="materials.create">
              <Link
                href="/materials/new"
                className={cn(linkButtonClassName("secondary", "sm"))}
              >
                <WithIcon icon={Plus}>{t("materials.new")}</WithIcon>
              </Link>
            </Can>
          )
        }
      />
    );
  }

  return (
    <MaterialList
      materials={materials}
      pagination={{
        page: result?.page ?? 1,
        pageSize: result?.pageSize ?? DEFAULT_PAGE_SIZE,
        total,
        totalPages: result?.totalPages ?? 1,
      }}
    />
  );
}
