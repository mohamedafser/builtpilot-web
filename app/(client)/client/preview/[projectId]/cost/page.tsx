import { ClientPortalCostSummaryView } from "@/components/client-portal/client-portal-cost-summary";
import { ClientPortalError } from "@/components/client-portal/client-portal-error";
import { portalUnavailableMessage } from "@/lib/client-portal/helpers";
import {
  getPreviewClientPortalBOQ,
  getPreviewClientPortalCost,
  getPreviewClientPortalQuotation,
  getPreviewClientPortalSession,
} from "@/lib/client-portal/queries";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function PreviewCostPage({ params }: PageProps) {
  const { projectId } = await params;
  const session = await getPreviewClientPortalSession(projectId);
  const result = await getPreviewClientPortalCost(projectId);

  if (result.error === "unavailable") {
    return <ClientPortalError message={portalUnavailableMessage()} />;
  }

  if (result.error) {
    return (
      <ClientPortalError message="Unable to load this project. Please contact your contractor." />
    );
  }

  let estimatedAmount: string | null = null;

  if (session.status === "ok" && session.settings.show_quotation) {
    const quotation = await getPreviewClientPortalQuotation(projectId);
    estimatedAmount = quotation.quotation?.total_amount ?? null;
  } else if (session.status === "ok" && session.settings.show_boq) {
    const boq = await getPreviewClientPortalBOQ(projectId);
    estimatedAmount = boq.boq?.summary.estimated_value ?? null;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-stone-900">Project cost</h1>
      <ClientPortalCostSummaryView
        cost={result.cost}
        estimatedAmount={estimatedAmount}
      />
    </div>
  );
}
