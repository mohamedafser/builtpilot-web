import { ClientPortalError } from "@/components/client-portal/client-portal-error";
import { ClientPortalMeasurements } from "@/components/client-portal/client-portal-measurements";
import { Pagination } from "@/components/ui/pagination";
import { parsePagination } from "@/lib/api/pagination";
import { portalUnavailableMessage } from "@/lib/client-portal/helpers";
import { getPreviewClientPortalMeasurements } from "@/lib/client-portal/queries";

type PageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ page?: string; page_size?: string }>;
};

export default async function PreviewMeasurementsPage({
  params,
  searchParams,
}: PageProps) {
  const { projectId } = await params;
  const result = await getPreviewClientPortalMeasurements(
    projectId,
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
