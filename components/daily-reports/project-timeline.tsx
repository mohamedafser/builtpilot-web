"use client";

import { formatDate } from "@/lib/utils";
import type { DailyReportListItem } from "@/lib/daily-reports/types";
import type { Project } from "@/types";
import Link from "next/link";

export function ProjectTimeline({
  project,
  reports,
}: {
  project: Project;
  reports: DailyReportListItem[];
}) {
  const chronological = [...reports].sort((a, b) =>
    a.report_date.localeCompare(b.report_date),
  );

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-stone-900">
        Project timeline
      </h3>
      <p className="mt-1 text-sm text-stone-500">
        A simple history of this job, from creation through the latest site
        report.
      </p>
      <ol className="mt-5 space-y-0">
        <TimelineItem
          title="Project created"
          subtitle={formatDate(project.created_at.slice(0, 10))}
          isFirst
        />
        {chronological.map((report, index) => {
          const isLatest = index === chronological.length - 1;

          return (
            <TimelineItem
              key={report.id}
              title={isLatest ? "Latest report" : "Daily report"}
              subtitle={formatDate(report.report_date)}
              href={`/projects/${project.id}/reports/${report.id}`}
              isLast={isLatest}
            />
          );
        })}
        {chronological.length === 0 ? (
          <TimelineItem
            title="No daily reports yet"
            subtitle="Create the first site diary entry to start this timeline."
            isLast
          />
        ) : null}
      </ol>
    </section>
  );
}

function TimelineItem({
  title,
  subtitle,
  href,
  isFirst = false,
  isLast = false,
}: {
  title: string;
  subtitle: string;
  href?: string;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={
            isLast && !isFirst
              ? "mt-1 h-3 w-3 rounded-full bg-amber-600"
              : "mt-1 h-3 w-3 rounded-full bg-stone-300"
          }
        />
        {!isLast ? <span className="w-px flex-1 bg-stone-200" /> : null}
      </div>
      <div className={isLast ? "pb-0" : "pb-5"}>
        {href ? (
          <Link
            href={href}
            className="text-sm font-medium text-stone-900 hover:text-amber-700"
          >
            {title}
          </Link>
        ) : (
          <p className="text-sm font-medium text-stone-900">{title}</p>
        )}
        <p className="mt-0.5 text-sm text-stone-500">{subtitle}</p>
      </div>
    </li>
  );
}
