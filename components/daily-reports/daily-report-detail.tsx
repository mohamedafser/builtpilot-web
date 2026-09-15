"use client";

import { DailyReportActions } from "@/components/daily-reports/daily-report-actions";
import { PhotoGallery } from "@/components/daily-reports/photo-gallery";
import { ShareDailyReportUpdateButton } from "@/components/communication/share-daily-report-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MANPOWER_ROLE_LABELS,
  MATERIAL_TYPE_LABELS,
  WEATHER_LABELS,
} from "@/constants/daily-report";
import { formatWorkerCount } from "@/lib/daily-reports/display";
import type { DailyReportDetail } from "@/lib/daily-reports/types";
import { formatDateLong } from "@/lib/utils";
import { isWeather } from "@/constants/daily-report";
import { useState } from "react";

function weatherText(value: string | null): string {
  if (!value) {
    return "—";
  }

  return isWeather(value) ? WEATHER_LABELS[value] : value;
}

function formatQuantity(value: string): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value;
  }

  return Number.isInteger(amount) ? String(amount) : String(amount);
}

export function DailyReportDetailView({
  projectId,
  detail,
}: {
  projectId: string;
  detail: DailyReportDetail;
}) {
  const [photos, setPhotos] = useState(detail.photos);
  const { report } = detail;
  const filledRoles = detail.manpower.filter((row) => row.worker_count > 0);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium tracking-wide text-amber-700 uppercase">
              Daily site report
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-stone-900">
              {formatDateLong(report.report_date)}
            </h2>
            {report.archived_at ? (
              <span className="mt-2 inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                Archived
              </span>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            {!report.archived_at ? (
              <ShareDailyReportUpdateButton
                projectId={projectId}
                detail={detail}
              />
            ) : null}
            <DailyReportActions
              projectId={projectId}
              reportId={report.id}
              reportDate={report.report_date}
              archived={Boolean(report.archived_at)}
              layout="stack"
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-stone-500">Weather</p>
            <p className="mt-1 text-lg font-semibold text-stone-900">
              {weatherText(report.weather)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-stone-500">Manpower</p>
            <p className="mt-1 text-lg font-semibold text-stone-900">
              {formatWorkerCount(detail.worker_count)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-stone-500">Photos</p>
            <p className="mt-1 text-lg font-semibold text-stone-900">
              {photos.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Work completed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 whitespace-pre-wrap text-stone-700">
            {report.work_completed}
          </p>
        </CardContent>
      </Card>

      {filledRoles.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Crew breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filledRoles.map((row) => (
                <div key={row.id}>
                  <dt className="text-sm text-stone-500">
                    {MANPOWER_ROLE_LABELS[row.role]}
                  </dt>
                  <dd className="mt-0.5 font-medium text-stone-800">
                    {row.worker_count}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Materials</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.materials.length === 0 ? (
            <p className="text-sm text-stone-500">No materials recorded.</p>
          ) : (
            <ul className="space-y-2 text-sm text-stone-700">
              {detail.materials.map((material) => (
                <li key={material.id}>
                  {formatQuantity(material.quantity)} {material.unit}{" "}
                  {material.material_name}{" "}
                  {MATERIAL_TYPE_LABELS[material.type].toLowerCase()}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 whitespace-pre-wrap text-stone-700">
            {report.issues || "No issues recorded."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tomorrow&apos;s plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 whitespace-pre-wrap text-stone-700">
            {report.tomorrow_plan || "No plan recorded."}
          </p>
        </CardContent>
      </Card>

      {report.general_notes ? (
        <Card>
          <CardHeader>
            <CardTitle>General notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 whitespace-pre-wrap text-stone-700">
              {report.general_notes}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Site photos</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoGallery
            projectId={projectId}
            reportId={report.id}
            photos={photos}
            onDeleted={(photoId) =>
              setPhotos((current) =>
                current.filter((photo) => photo.id !== photoId),
              )
            }
          />
        </CardContent>
      </Card>

      <p className="text-sm text-stone-500">
        Created by {detail.created_by_name || "a workspace member"}
      </p>
    </div>
  );
}
