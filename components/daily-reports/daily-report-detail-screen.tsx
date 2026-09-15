"use client";

import { DailyReportDetailView } from "@/components/daily-reports/daily-report-detail";
import { DailyReportDetailSkeleton } from "@/components/daily-reports/daily-report-skeletons";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useApiData } from "@/hooks/use-api-data";
import type { DailyReportDetail } from "@/lib/daily-reports/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function DailyReportDetailScreen({
  projectId,
  reportId,
}: {
  projectId: string;
  reportId: string;
}) {
  const { data, error, isLoading } = useApiData<DailyReportDetail>(
    `/api/projects/${projectId}/reports/${reportId}`,
  );

  if (isLoading) {
    return <DailyReportDetailSkeleton />;
  }

  if (error === "Daily report not found." || error === "Project not found.") {
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

  if (error || !data) {
    return (
      <Alert variant="error">{error ?? "Unable to load this report."}</Alert>
    );
  }

  return <DailyReportDetailView projectId={projectId} detail={data} />;
}
