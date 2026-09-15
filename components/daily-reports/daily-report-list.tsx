"use client";

import { DailyReportActions } from "@/components/daily-reports/daily-report-actions";
import { Pagination } from "@/components/ui/pagination";
import { WEATHER_LABELS, isWeather } from "@/constants/daily-report";
import type { PaginationMeta } from "@/lib/api/pagination";
import { formatWorkerCount, workPreview } from "@/lib/daily-reports/display";
import type { DailyReportListItem } from "@/lib/daily-reports/types";
import { cn, formatDate } from "@/lib/utils";
import Link from "next/link";

function weatherText(value: string | null): string {
  if (!value) {
    return "—";
  }

  return isWeather(value) ? WEATHER_LABELS[value] : value;
}

export function DailyReportList({
  projectId,
  reports,
  pagination,
}: {
  projectId: string;
  reports: DailyReportListItem[];
  pagination: PaginationMeta;
}) {
  const pager = (
    <Pagination
      page={pagination.page}
      pageSize={pagination.pageSize}
      total={pagination.total}
      totalPages={pagination.totalPages}
    />
  );

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-stone-200 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Weather</th>
              <th className="px-4 py-3 font-medium">Work completed</th>
              <th className="px-4 py-3 font-medium">Issues</th>
              <th className="px-4 py-3 font-medium">Photos</th>
              <th className="px-4 py-3 font-medium">Created by</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="border-t border-stone-100">
                <td className="px-4 py-3">
                  <Link
                    href={`/projects/${projectId}/reports/${report.id}`}
                    className="font-medium text-stone-900 hover:text-amber-700"
                  >
                    {formatDate(report.report_date)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-stone-600">
                  {weatherText(report.weather)}
                </td>
                <td className="max-w-sm px-4 py-3 text-stone-600">
                  {workPreview(report.work_completed) || "—"}
                </td>
                <td className="px-4 py-3">
                  {report.issues ? (
                    <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-800">
                      Issues
                    </span>
                  ) : (
                    <span className="text-stone-400">None</span>
                  )}
                </td>
                <td className="px-4 py-3 text-stone-600">
                  {report.photo_count}
                </td>
                <td className="px-4 py-3 text-stone-600">
                  {report.created_by_name || "—"}
                </td>
                <td className="px-4 py-3">
                  <DailyReportActions
                    projectId={projectId}
                    reportId={report.id}
                    reportDate={report.report_date}
                    archived={Boolean(report.archived_at)}
                    showView
                  />
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
        {pager}
      </div>

      <div className="space-y-3 md:hidden">
        {reports.map((report) => (
          <Link
            key={report.id}
            href={`/projects/${projectId}/reports/${report.id}`}
            className="block rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-stone-900">
                {formatDate(report.report_date)}
              </p>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  report.issues
                    ? "bg-orange-100 text-orange-800"
                    : "bg-stone-100 text-stone-600",
                )}
              >
                {report.issues ? "Issues" : weatherText(report.weather)}
              </span>
            </div>
            <p className="mt-2 text-sm text-stone-600">
              {workPreview(report.work_completed) || "No work notes"}
            </p>
            <p className="mt-2 text-xs text-stone-500">
              {formatWorkerCount(report.worker_count)} · {report.photo_count}{" "}
              {report.photo_count === 1 ? "photo" : "photos"}
              {report.created_by_name ? ` · ${report.created_by_name}` : ""}
            </p>
          </Link>
        ))}
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          {pager}
        </div>
      </div>
    </>
  );
}
