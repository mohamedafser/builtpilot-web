"use client";

import { DailyReportForm } from "@/components/daily-reports/daily-report-form";
import { DailyReportFormSkeleton } from "@/components/daily-reports/daily-report-skeletons";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useApiData } from "@/hooks/use-api-data";
import { useProject } from "@/hooks/use-project";
import type { DailyReportDetail } from "@/lib/daily-reports/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function NewDailyReportScreen({ projectId }: { projectId: string }) {
  const { project, error, notFound, isLoading } = useProject(projectId);

  if (isLoading) {
    return <DailyReportFormSkeleton />;
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

  if (error || !project) {
    return (
      <Alert variant="error">{error ?? "Unable to load this project."}</Alert>
    );
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>New daily report</CardTitle>
        <p className="mt-1 text-sm text-stone-500">
          Record today&apos;s progress for {project.name}. One report per date.
        </p>
      </CardHeader>
      <CardContent>
        <DailyReportForm project={project} />
      </CardContent>
    </Card>
  );
}

export function EditDailyReportScreen({
  projectId,
  reportId,
}: {
  projectId: string;
  reportId: string;
}) {
  const {
    project,
    error: projectError,
    notFound,
    isLoading,
  } = useProject(projectId);
  const {
    data,
    error: reportError,
    isLoading: reportLoading,
  } = useApiData<DailyReportDetail>(
    `/api/projects/${projectId}/reports/${reportId}`,
  );

  if (isLoading || reportLoading) {
    return <DailyReportFormSkeleton />;
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

  if (
    reportError === "Daily report not found." ||
    reportError === "Project not found."
  ) {
    return (
      <EmptyState
        title="Daily report not found"
        description="This report does not exist or you do not have access to it."
        action={
          <Link
            href={`/projects/${projectId}/reports`}
            className={cn(linkButtonClassName("secondary"))}
          >
            Back to reports
          </Link>
        }
      />
    );
  }

  if (projectError || reportError || !project || !data) {
    return (
      <Alert variant="error">
        {projectError ?? reportError ?? "Unable to load this report."}
      </Alert>
    );
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Edit daily report</CardTitle>
        <p className="mt-1 text-sm text-stone-500">
          Update the site diary for {project.name}. Project and author cannot be
          changed.
        </p>
      </CardHeader>
      <CardContent>
        <DailyReportForm project={project} detail={data} />
      </CardContent>
    </Card>
  );
}
