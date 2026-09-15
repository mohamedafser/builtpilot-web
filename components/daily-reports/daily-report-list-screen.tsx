"use client";

import { DailyReportFilters } from "@/components/daily-reports/daily-report-filters";
import { DailyReportList } from "@/components/daily-reports/daily-report-list";
import { DailyReportListSkeleton } from "@/components/daily-reports/daily-report-skeletons";
import {
  CompactStatStrip,
  ProjectSectionHeader,
  ProjectSectionPrimaryLink,
} from "@/components/projects/project-section-chrome";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { WithIcon } from "@/components/ui/with-icon";
import { DEFAULT_PAGE_SIZE } from "@/lib/api/pagination";
import { useApiData } from "@/hooks/use-api-data";
import type { DailyReportListItem } from "@/lib/daily-reports/types";
import { cn } from "@/lib/utils";
import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type ReportListResponse = {
  reports: DailyReportListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function DailyReportListScreen({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const archived = searchParams.get("archived") ?? "";
  const page = searchParams.get("page") ?? "1";
  const pageSize = searchParams.get("page_size") ?? String(DEFAULT_PAGE_SIZE);

  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (archived) params.set("archived", archived);
  params.set("page", page);
  params.set("page_size", pageSize);

  const { data, error, isLoading } = useApiData<ReportListResponse>(
    `/api/projects/${projectId}/reports?${params.toString()}`,
  );

  const reports = data?.reports ?? [];
  const total = data?.total ?? 0;
  const hasFilters = Boolean(query || from || to || archived);
  const withIssues = reports.filter((report) =>
    Boolean(report.issues?.trim()),
  ).length;
  const withPhotos = reports.filter((report) => report.photo_count > 0).length;
  const showPageHint = reports.length > 0 && reports.length < total;

  return (
    <div className="space-y-4">
      <ProjectSectionHeader
        title="Site updates"
        description="Daily progress and site notes"
        action={
          <ProjectSectionPrimaryLink
            href={`/projects/${projectId}/reports/new`}
            icon={Plus}
          >
            New report
          </ProjectSectionPrimaryLink>
        }
      />

      {!isLoading && !error && total > 0 ? (
        <CompactStatStrip
          stats={[
            {
              label: "Reports",
              value: String(total),
            },
            {
              label: "With issues",
              value: String(withIssues),
              hint: showPageHint ? "This page" : undefined,
              tone: withIssues > 0 ? "warn" : "default",
            },
            {
              label: "With photos",
              value: String(withPhotos),
              hint: showPageHint ? "This page" : undefined,
            },
          ]}
        />
      ) : null}

      <DailyReportFilters />

      {isLoading ? (
        <DailyReportListSkeleton />
      ) : error ? (
        <Alert variant="error">{error}</Alert>
      ) : total === 0 ? (
        <EmptyState
          icon={FileText}
          title="No daily reports yet"
          description={
            hasFilters
              ? "No reports match these filters."
              : "Start recording your project's daily progress."
          }
          action={
            <Link
              href={`/projects/${projectId}/reports/new`}
              className={cn(linkButtonClassName("primary", "sm"))}
            >
              <WithIcon icon={Plus}>Create Daily Report</WithIcon>
            </Link>
          }
        />
      ) : (
        <DailyReportList
          projectId={projectId}
          reports={reports}
          pagination={{
            page: data?.page ?? 1,
            pageSize: data?.pageSize ?? DEFAULT_PAGE_SIZE,
            total,
            totalPages: data?.totalPages ?? 1,
          }}
        />
      )}
    </div>
  );
}
