"use client";

import { ProjectTimeline } from "@/components/daily-reports/project-timeline";
import { DailyReportListSkeleton } from "@/components/daily-reports/daily-report-skeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { linkButtonClassName } from "@/components/ui/button";
import { WithIcon } from "@/components/ui/with-icon";
import { WEATHER_LABELS, isWeather } from "@/constants/daily-report";
import { useApiData } from "@/hooks/use-api-data";
import { formatWorkerCount, workPreview } from "@/lib/daily-reports/display";
import type { DailyReportListItem } from "@/lib/daily-reports/types";
import { cn, formatDate } from "@/lib/utils";
import type { Project } from "@/types";
import { Plus } from "lucide-react";
import Link from "next/link";

function weatherText(value: string | null): string {
  if (!value) {
    return "—";
  }

  return isWeather(value) ? WEATHER_LABELS[value] : value;
}

export function ProjectDailyReportsSection({ project }: { project: Project }) {
  const { data, error, isLoading } = useApiData<{
    reports: DailyReportListItem[];
    total: number;
  }>(`/api/projects/${project.id}/reports?page_size=50`);

  const reports = data?.reports ?? [];
  const latest = reports[0] ?? null;
  const recent = reports.slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-stone-900">
              Latest daily report
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              The most recent site diary for this project.
            </p>
          </div>
          <Link
            href={`/projects/${project.id}/reports/new`}
            className={cn(linkButtonClassName(), "h-12 sm:h-10")}
          >
            <WithIcon icon={Plus}>Create daily report</WithIcon>
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-4">
            <DailyReportListSkeleton />
          </div>
        ) : error ? (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        ) : !latest ? (
          <p className="mt-4 text-sm text-stone-500">
            No daily reports yet. Start recording your project&apos;s daily
            progress.
          </p>
        ) : (
          <Link
            href={`/projects/${project.id}/reports/${latest.id}`}
            className="mt-4 block rounded-lg border border-stone-200 bg-stone-50 p-4 hover:border-amber-300"
          >
            <p className="font-semibold text-stone-900">
              {formatDate(latest.report_date)}
            </p>
            <p className="mt-1 text-sm text-stone-600">
              {workPreview(latest.work_completed) || "No work notes"}
            </p>
            <p className="mt-2 text-xs text-stone-500">
              {formatWorkerCount(latest.worker_count)} · {latest.photo_count}{" "}
              {latest.photo_count === 1 ? "photo" : "photos"} · Weather{" "}
              {weatherText(latest.weather)}
            </p>
          </Link>
        )}
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Recent daily reports</CardTitle>
          <Link
            href={`/projects/${project.id}/reports`}
            className="text-sm font-medium text-amber-700 hover:text-amber-800"
          >
            View all reports
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <DailyReportListSkeleton />
          ) : recent.length === 0 ? (
            <p className="text-sm text-stone-500">No daily reports yet.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {recent.map((report) => (
                <li key={report.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/projects/${project.id}/reports/${report.id}`}
                    className="block hover:text-amber-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-stone-900">
                        {formatDate(report.report_date)}
                      </p>
                      <p className="text-xs text-stone-500">
                        {weatherText(report.weather)}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-stone-600">
                      {workPreview(report.work_completed) || "No work notes"}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {report.created_by_name || "Workspace member"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ProjectTimeline project={project} reports={reports} />
    </div>
  );
}
