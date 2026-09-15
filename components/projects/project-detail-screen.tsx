"use client";

import { ProjectDetail } from "@/components/projects/project-detail";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/hooks/use-project";
import { cn } from "@/lib/utils";
import Link from "next/link";

function ProjectDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <Skeleton className="h-8 w-64" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-5">
        <Skeleton className="h-48 rounded-xl xl:col-span-2" />
        <Skeleton className="h-48 rounded-xl xl:col-span-3" />
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  );
}

export function ProjectDetailScreen({ id }: { id: string }) {
  const { project, error, notFound, isLoading } = useProject(id);

  if (isLoading) {
    return <ProjectDetailSkeleton />;
  }

  if (notFound) {
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

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (!project) {
    return null;
  }

  return <ProjectDetail project={project} />;
}
