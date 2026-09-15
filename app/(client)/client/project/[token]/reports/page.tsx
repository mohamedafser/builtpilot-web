import { ClientPortalEmptyState } from "@/components/client-portal/client-portal-empty-state";
import { ClientPortalError } from "@/components/client-portal/client-portal-error";
import { ClientPortalReportCard } from "@/components/client-portal/client-portal-report-card";
import { Pagination } from "@/components/ui/pagination";
import { parsePagination } from "@/lib/api/pagination";
import { clientPortalHref, portalUnavailableMessage } from "@/lib/client-portal/helpers";
import {
  getClientPortalReports,
  getClientPortalSession,
} from "@/lib/client-portal/queries";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ page?: string; page_size?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Site updates" };
}

export default async function ClientPortalReportsPage({
  params,
  searchParams,
}: PageProps) {
  const { token } = await params;
  const session = await getClientPortalSession(token);

  if (session.status !== "ok") {
    return null;
  }

  const pagination = parsePagination(await searchParams);
  const result = await getClientPortalReports(token, pagination);

  if (result.error === "unavailable") {
    return <ClientPortalError message={portalUnavailableMessage()} />;
  }

  if (!result.result) {
    return (
      <ClientPortalError message="Unable to load this project. Please contact your contractor." />
    );
  }

  if (result.result.items.length === 0) {
    return (
      <ClientPortalEmptyState
        title="No site updates have been shared yet."
        description="Your contractor will share site updates here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-stone-900">Site updates</h1>
      <ul className="space-y-3">
        {result.result.items.map((report) => (
          <li key={report.id}>
            <ClientPortalReportCard
              report={report}
              href={clientPortalHref(session.base, `reports/${report.id}`)}
              showPhotoCount={session.settings.show_site_photos}
            />
          </li>
        ))}
      </ul>
      <Pagination {...result.result} />
    </div>
  );
}
