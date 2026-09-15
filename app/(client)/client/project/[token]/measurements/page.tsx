import { ClientPortalError } from "@/components/client-portal/client-portal-error";
import { ClientPortalMeasurements } from "@/components/client-portal/client-portal-measurements";
import { Pagination } from "@/components/ui/pagination";
import { parsePagination } from "@/lib/api/pagination";
import { portalUnavailableMessage } from "@/lib/client-portal/helpers";
import {
  getClientPortalMeasurements,
  getClientPortalSession,
} from "@/lib/client-portal/queries";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ page?: string; page_size?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Measurements" };
}

export default async function ClientPortalMeasurementsPage({
  params,
  searchParams,
}: PageProps) {
  const { token } = await params;
  const session = await getClientPortalSession(token);

  if (session.status !== "ok") {
    return null;
  }

  const result = await getClientPortalMeasurements(
    token,
    parsePagination(await searchParams),
  );

  if (result.error === "unavailable") {
    return <ClientPortalError message={portalUnavailableMessage()} />;
  }

  if (!result.result) {
    return (
      <ClientPortalError message="Unable to load this project. Please contact your contractor." />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-stone-900">Measurements</h1>
      <ClientPortalMeasurements measurements={result.result.items} />
      <Pagination {...result.result} />
    </div>
  );
}
