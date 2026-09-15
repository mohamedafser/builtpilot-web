import { ClientPortalBOQView } from "@/components/client-portal/client-portal-boq";
import { ClientPortalError } from "@/components/client-portal/client-portal-error";
import { portalUnavailableMessage } from "@/lib/client-portal/helpers";
import {
  getClientPortalBOQ,
  getClientPortalSession,
} from "@/lib/client-portal/queries";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Work progress" };
}

export default async function ClientPortalBoqPage({ params }: PageProps) {
  const { token } = await params;
  const session = await getClientPortalSession(token);

  if (session.status !== "ok") {
    return null;
  }

  const result = await getClientPortalBOQ(token);

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
      <h1 className="text-xl font-semibold text-stone-900">Work progress</h1>
      <ClientPortalBOQView boq={result.boq} />
    </div>
  );
}
