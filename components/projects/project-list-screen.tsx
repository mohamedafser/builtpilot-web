"use client";

import { Can } from "@/components/permissions/can";
import { ProjectList } from "@/components/projects/project-list";
import { ProjectListSkeleton } from "@/components/projects/project-list-skeleton";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DEFAULT_PAGE_SIZE } from "@/lib/api/pagination";
import { requestJson } from "@/lib/api/client";
import {
  apiCacheKey,
  getApiCacheGeneration,
  readApiCache,
  writeApiCache,
} from "@/lib/api/client-cache";
import { WithIcon } from "@/components/ui/with-icon";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";
import { FolderKanban, FilterX, Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ProjectWithPendingActions } from "@/lib/projects/queries";

type ProjectListResponse = {
  projects: ProjectWithPendingActions[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function buildProjectsUrl(input: {
  query: string;
  status: string;
  archived: string;
  page: string;
  pageSize: string;
}) {
  const params = new URLSearchParams();

  if (input.query) {
    params.set("q", input.query);
  }
  if (input.status) {
    params.set("status", input.status);
  }
  if (input.archived) {
    params.set("archived", input.archived);
  }
  params.set("page", input.page);
  params.set("page_size", input.pageSize);

  return `/api/projects?${params.toString()}`;
}

export function ProjectListScreen() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const archived = searchParams.get("archived") ?? "";
  const page = searchParams.get("page") ?? "1";
  const pageSize = searchParams.get("page_size") ?? String(DEFAULT_PAGE_SIZE);

  const url = useMemo(
    () => buildProjectsUrl({ query, status, archived, page, pageSize }),
    [query, status, archived, page, pageSize],
  );
  const cacheKey = apiCacheKey(url);
  const cached = readApiCache<ProjectListResponse>(cacheKey);

  const [result, setResult] = useState<ProjectListResponse | null>(cached);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;
    const existing = readApiCache<ProjectListResponse>(cacheKey);

    if (existing) {
      setResult(existing);
      setError(null);
      setIsLoading(false);
      return;
    }

    const requestGeneration = getApiCacheGeneration();

    async function load() {
      setIsLoading(true);
      setError(null);

      const response = await requestJson<ProjectListResponse>(url);

      if (cancelled) {
        return;
      }

      if (!response.ok) {
        setError(response.message);
        setResult(null);
        setIsLoading(false);
        return;
      }

      if (requestGeneration === getApiCacheGeneration()) {
        writeApiCache(cacheKey, response.data);
      }

      setResult(response.data);
      setIsLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [url, cacheKey]);

  if (isLoading) {
    return <ProjectListSkeleton />;
  }

  if (error) {
    return <Alert variant="error">{t("projects.loadError")}</Alert>;
  }

  const projects = result?.projects ?? [];
  const total = result?.total ?? 0;
  const currentPage = result?.page ?? 1;
  const totalPages = result?.totalPages ?? 1;
  const hasActiveFilters = Boolean(query || status || archived);

  if (!total) {
    return (
      <EmptyState
        icon={FolderKanban}
        title={
          archived
            ? "No archived projects"
            : hasActiveFilters
              ? "No matching projects"
              : t("projects.empty")
        }
        description={
          archived
            ? "Archived jobs will appear here when you move them out of the active list."
            : hasActiveFilters
              ? "Try a different search or status filter."
              : t("projects.emptyHint")
        }
        action={
          archived || hasActiveFilters ? (
            <Link
              href="/projects"
              className={cn(linkButtonClassName("secondary"))}
            >
              <WithIcon icon={FilterX}>{t("common.clearFilters")}</WithIcon>
            </Link>
          ) : (
            <Can permission="projects.create">
              <Link href="/projects/new" className={cn(linkButtonClassName())}>
                <WithIcon icon={Plus}>{t("projects.new")}</WithIcon>
              </Link>
            </Can>
          )
        }
      />
    );
  }

  return (
    <ProjectList
      projects={projects}
      pagination={{
        page: currentPage,
        pageSize: result?.pageSize ?? DEFAULT_PAGE_SIZE,
        total,
        totalPages,
      }}
    />
  );
}
