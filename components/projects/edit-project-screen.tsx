"use client";

import { ProjectForm } from "@/components/projects/project-form";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject } from "@/hooks/use-project";
import { cn } from "@/lib/utils";
import Link from "next/link";

function EditProjectSkeleton() {
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

export function EditProjectScreen({ id }: { id: string }) {
  const { project, error, notFound, isLoading } = useProject(id);

  if (isLoading) {
    return <EditProjectSkeleton />;
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

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Edit project</CardTitle>
        <p className="mt-1 text-sm text-stone-500">
          Update job details for {project.name}. The business cannot be changed.
        </p>
      </CardHeader>
      <CardContent>
        <ProjectForm project={project} />
      </CardContent>
    </Card>
  );
}
