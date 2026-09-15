import { ClientPortalError } from "@/components/client-portal/client-portal-error";
import { ClientPortalQuotationView } from "@/components/client-portal/client-portal-quotation";
import { portalUnavailableMessage } from "@/lib/client-portal/helpers";
import {
  getClientPortalQuotation,
  getClientPortalSession,
} from "@/lib/client-portal/queries";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Quotation" };
}

export default async function ClientPortalQuotationPage({ params }: PageProps) {
  const { token } = await params;
  const session = await getClientPortalSession(token);

  if (session.status !== "ok") {
    return null;
  }

  const result = await getClientPortalQuotation(token);

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
