import { ClientPortalEmptyState } from "@/components/client-portal/client-portal-empty-state";
import { ClientPortalPhotoGallery } from "@/components/client-portal/client-portal-photo-gallery";
import { ClientPortalProgress } from "@/components/client-portal/client-portal-progress";
import { ClientPortalReportCard } from "@/components/client-portal/client-portal-report-card";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { linkButtonClassName } from "@/components/ui/button";
import { WithIcon } from "@/components/ui/with-icon";
import { projectStatusLabel } from "@/constants/client-portal";
import {
  clientPortalHref,
  formatPortalMoney,
} from "@/lib/client-portal/helpers";
import type {
  ClientPortalOverview,
  ClientPortalSession,
} from "@/lib/client-portal/types";
import { cn, formatDate } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function ClientPortalOverview({
  session,
  overview,
}: {
  session: ClientPortalSession;
  overview: ClientPortalOverview;
}) {
  const { project, settings } = session;

  return (
    <div className="space-y-5">
      {settings.show_project_overview ? (
        <Card>
          <CardHeader>
            <CardTitle>Project overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-stone-900">
                {project.name}
              </h2>
              <StatusBadge status={project.status} />
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              {settings.show_project_location ? (
                <div>
                  <dt className="text-sm text-stone-500">Location</dt>
                  <dd className="mt-1 font-medium text-stone-800">
                    {project.location || "—"}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-sm text-stone-500">Status</dt>
                <dd className="mt-1 font-medium text-stone-800">
                  {projectStatusLabel(project.status)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-stone-500">Start date</dt>
                <dd className="mt-1 font-medium text-stone-800">
                  {formatDate(project.start_date)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-stone-500">Expected completion</dt>
                <dd className="mt-1 font-medium text-stone-800">
                  {formatDate(project.expected_end_date)}
                </dd>
              </div>
            </dl>
            {settings.show_client_contact ? (
              <dl className="grid gap-4 border-t border-stone-100 pt-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-stone-500">Client</dt>
                  <dd className="mt-1 font-medium text-stone-800">
                    {project.client_name || session.access.client_name}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-stone-500">Contact</dt>
                  <dd className="mt-1 font-medium text-stone-800">
                    {project.client_phone ||
                      project.client_email ||
                      session.access.client_phone ||
                      session.access.client_email ||
                      "—"}
                  </dd>
                </div>
              </dl>
            ) : null}
            {project.description ? (
              <div className="border-t border-stone-100 pt-4">
                <h3 className="text-sm font-medium text-stone-500">
                  About this project
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">
                  {project.description}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {settings.show_boq ? (
        overview.boq ? (
          <ClientPortalProgress summary={overview.boq.summary} />
        ) : (
          <ClientPortalEmptyState
            title="Progress not available"
            description="Work progress has not been added yet."
          />
        )
      ) : null}

      {settings.show_daily_reports ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Latest site update</CardTitle>
            <Link
              href={clientPortalHref(session.base, "reports")}
              className={cn(linkButtonClassName("ghost", "sm"))}
            >
              <WithIcon icon={ArrowRight}>View all</WithIcon>
            </Link>
          </CardHeader>
          <CardContent>
            {overview.latestReport ? (
              <ClientPortalReportCard
                report={overview.latestReport}
                href={clientPortalHref(
                  session.base,
                  `reports/${overview.latestReport.id}`,
                )}
                showPhotoCount={settings.show_site_photos}
              />
            ) : (
              <ClientPortalEmptyState
                title="No site updates have been shared yet."
                description="Your contractor will share site updates here."
              />
            )}
          </CardContent>
        </Card>
      ) : null}

      {settings.show_site_photos ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Photos</CardTitle>
            <Link
              href={clientPortalHref(session.base, "photos")}
              className={cn(linkButtonClassName("ghost", "sm"))}
            >
              <WithIcon icon={ArrowRight}>View all</WithIcon>
            </Link>
          </CardHeader>
          <CardContent>
            <ClientPortalPhotoGallery photos={overview.recentPhotos} />
          </CardContent>
        </Card>
      ) : null}

      {settings.show_boq && overview.boq ? (
        <Link
          href={clientPortalHref(session.base, "boq")}
          className="block rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
        >
          <p className="text-sm text-stone-500">Work progress</p>
          <p className="mt-1 text-lg font-semibold text-stone-900">
            {overview.boq.name}
          </p>
          <p className="mt-2 text-sm text-stone-600">
            {overview.boq.summary.item_count} items · remaining{" "}
            {formatPortalMoney(overview.boq.summary.remaining_value)}
          </p>
        </Link>
      ) : null}

      {settings.show_measurements ? (
        <Link
          href={clientPortalHref(session.base, "measurements")}
          className="block rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
        >
          <p className="text-sm text-stone-500">Measurements</p>
          <p className="mt-1 text-lg font-semibold text-stone-900">
            {overview.measurementCount > 0
              ? `${overview.measurementCount} recorded`
              : "No measurements have been recorded yet."}
          </p>
        </Link>
      ) : null}

      {settings.show_quotation ? (
        overview.quotation ? (
          <Link
            href={clientPortalHref(session.base, "quotation")}
            className="block rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-stone-500">Quotation</p>
            <p className="mt-1 text-lg font-semibold text-stone-900">
              {overview.quotation.quotation_number}
            </p>
            <p className="mt-2 text-sm text-stone-600">
              {overview.quotation.title} ·{" "}
              {formatPortalMoney(overview.quotation.total_amount)}
            </p>
          </Link>
        ) : (
          <ClientPortalEmptyState
            title="No quotation has been shared."
            description="A quotation will appear here if your contractor shares one."
          />
        )
      ) : null}

      {settings.show_project_cost ? (
        overview.cost ? (
          <Link
            href={clientPortalHref(session.base, "cost")}
            className="block rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-stone-500">Project cost</p>
            <p className="mt-1 text-lg font-semibold text-stone-900">
              {formatPortalMoney(overview.cost.total_cost)}
            </p>
          </Link>
        ) : (
          <ClientPortalEmptyState
            title="Project cost details are not available."
            description="Cost details will appear here if your contractor shares them."
          />
        )
      ) : null}
    </div>
  );
}
