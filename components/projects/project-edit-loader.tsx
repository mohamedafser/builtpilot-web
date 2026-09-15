"use client";

import { ProjectForm } from "@/components/projects/project-form";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/use-api-data";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";
import Link from "next/link";

export function ProjectEditLoader({ projectId }: { projectId: string }) {
  const { data, error, isLoading } = useApiData<{ project: Project }>(
    `/api/projects/${projectId}`,
  );

  if (isLoading) {
    return (
      <div className="max-w-3xl rounded-xl border border-stone-200 bg-white p-5">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="mt-2 h-4 w-72" />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
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

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Edit project</CardTitle>
        <p className="mt-1 text-sm text-stone-500">
          Update job details for {data.project.name}. The business cannot be
          changed.
        </p>
      </CardHeader>
      <CardContent>
        <ProjectForm project={data.project} />
      </CardContent>
    </Card>
  );
}
