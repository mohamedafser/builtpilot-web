"use client";

import { ProjectList } from "@/components/projects/project-list";
import { ProjectListSkeleton } from "@/components/projects/project-list-skeleton";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { WithIcon } from "@/components/ui/with-icon";
import { DEFAULT_PAGE_SIZE } from "@/lib/api/pagination";
import { useApiData } from "@/hooks/use-api-data";
import type { ProjectWithPendingActions } from "@/lib/projects/queries";
import { cn } from "@/lib/utils";
import { FilterX, Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function ProjectListLoader() {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const { data, error, isLoading } = useApiData<{
    projects: ProjectWithPendingActions[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }>(query ? `/api/projects?${query}` : "/api/projects");

  if (isLoading) {
    return <ProjectListSkeleton />;
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  const projects = data?.projects ?? [];
  const total = data?.total ?? 0;
  const hasActiveFilters = Boolean(
    searchParams.get("q") ||
      searchParams.get("status") ||
      searchParams.get("archived"),
  );
  const archived = searchParams.get("archived") === "1";

  if (!total) {
    return (
      <EmptyState
        title={
          archived
            ? "No archived projects"
            : hasActiveFilters
              ? "No matching projects"
              : "No projects yet"
        }
        description={
          archived
            ? "Archived jobs will appear here when you move them out of the active list."
            : hasActiveFilters
              ? "Try a different search or status filter."
              : "Create your first construction project to get started."
        }
        action={
          archived || hasActiveFilters ? (
            <Link
              href="/projects"
              className={cn(linkButtonClassName("secondary"))}
            >
              <WithIcon icon={FilterX}>Clear filters</WithIcon>
            </Link>
          ) : (
            <Link href="/projects/new" className={cn(linkButtonClassName())}>
              <WithIcon icon={Plus}>Create Project</WithIcon>
            </Link>
          )
        }
      />
    );
  }

  return (
    <ProjectList
      projects={projects}
      pagination={{
        page: data?.page ?? 1,
        pageSize: data?.pageSize ?? DEFAULT_PAGE_SIZE,
        total,
        totalPages: data?.totalPages ?? 1,
      }}
    />
  );
}
