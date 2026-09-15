import { ClientPortalCostSummaryView } from "@/components/client-portal/client-portal-cost-summary";
import { ClientPortalError } from "@/components/client-portal/client-portal-error";
import { portalUnavailableMessage } from "@/lib/client-portal/helpers";
import {
  getClientPortalBOQ,
  getClientPortalCostSummary,
  getClientPortalQuotation,
  getClientPortalSession,
} from "@/lib/client-portal/queries";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Project cost" };
}

export default async function ClientPortalCostPage({ params }: PageProps) {
  const { token } = await params;
  const session = await getClientPortalSession(token);

  if (session.status !== "ok") {
    return null;
  }

  const result = await getClientPortalCostSummary(token);

  if (result.error === "unavailable") {
    return <ClientPortalError message={portalUnavailableMessage()} />;
  }

  if (result.error) {
    return (
      <ClientPortalError message="Unable to load this project. Please contact your contractor." />
    );
  }

  let estimatedAmount: string | null = null;

  if (session.settings.show_quotation) {
    const quotation = await getClientPortalQuotation(token);
    estimatedAmount = quotation.quotation?.total_amount ?? null;
  } else if (session.settings.show_boq) {
    const boq = await getClientPortalBOQ(token);
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
