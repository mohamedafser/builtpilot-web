"use client";

import { ProjectDetail } from "@/components/projects/project-detail";
import { ProjectDetailSkeleton } from "@/components/projects/project-detail-skeleton";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useApiData } from "@/hooks/use-api-data";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";
import Link from "next/link";

export function ProjectDetailLoader({ projectId }: { projectId: string }) {
  const { data, error, isLoading } = useApiData<{ project: Project }>(
    `/api/projects/${projectId}`,
  );

  if (isLoading) {
    return <ProjectDetailSkeleton />;
  }

  if (error === "Project not found.") {
    return (
      <EmptyState
        title="Project not found"
        description="This project does not exist or you do not have access to it."
        action={
          <Link
            href="/projects"
            className={cn(linkButtonClassName("secondary"))}
          >
            Back to projects
          </Link>
        }
      />
    );
  }

  if (error || !data?.project) {
    return <Alert variant="error">{error ?? "Project not found."}</Alert>;
  }

  return <ProjectDetail project={data.project} />;
}
