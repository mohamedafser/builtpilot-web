import { ClientPortalError } from "@/components/client-portal/client-portal-error";
import { ClientPortalReportDetailView } from "@/components/client-portal/client-portal-report-detail";
import { linkButtonClassName } from "@/components/ui/button";
import {
  clientPortalHref,
  portalUnavailableMessage,
} from "@/lib/client-portal/helpers";
import {
  getClientPortalReport,
  getClientPortalSession,
} from "@/lib/client-portal/queries";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import Link from "next/link";

type PageProps = {
  params: Promise<{ token: string; reportId: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Site update" };
}

export default async function ClientPortalReportDetailPage({
  params,
}: PageProps) {
  const { token, reportId } = await params;
  const session = await getClientPortalSession(token);

  if (session.status !== "ok") {
    return null;
  }

  const result = await getClientPortalReport(token, reportId);

  if (result.error === "unavailable" || result.error === "not_found") {
    return <ClientPortalError message={portalUnavailableMessage()} />;
  }

  if (!result.detail) {
    return (
      <ClientPortalError message="Unable to load this project. Please contact your contractor." />
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href={clientPortalHref(session.base, "reports")}
        className={cn(linkButtonClassName("ghost", "sm"))}
      >
        Back to site updates
      </Link>
      <ClientPortalReportDetailView detail={result.detail} />
    </div>
  );
}
