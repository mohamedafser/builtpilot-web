import { ClientPortalError } from "@/components/client-portal/client-portal-error";
import { ClientPortalQuotationView } from "@/components/client-portal/client-portal-quotation";
import { portalUnavailableMessage } from "@/lib/client-portal/helpers";
import { getPreviewClientPortalQuotation } from "@/lib/client-portal/queries";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function PreviewQuotationPage({ params }: PageProps) {
  const { projectId } = await params;
  const result = await getPreviewClientPortalQuotation(projectId);

  if (result.error === "unavailable") {
    return <ClientPortalError message={portalUnavailableMessage()} />;
  }

  if (result.error) {
    return (
      <ClientPortalError message="Unable to load this project. Please contact your contractor." />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-stone-900">Quotation</h1>
      <ClientPortalQuotationView quotation={result.quotation} />
    </div>
  );
}
