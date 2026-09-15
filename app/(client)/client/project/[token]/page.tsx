import { ClientPortalError } from "@/components/client-portal/client-portal-error";
import { ClientPortalOverview } from "@/components/client-portal/client-portal-overview";
import {
  getClientPortalOverview,
  getClientPortalSession,
} from "@/lib/client-portal/queries";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  const session = await getClientPortalSession(token);

  if (session.status !== "ok") {
    return { title: "Client portal" };
  }

  return { title: session.project.name };
}

export default async function ClientPortalHomePage({ params }: PageProps) {
  const { token } = await params;
  const session = await getClientPortalSession(token);

  if (session.status !== "ok") {
    return null;
  }

  const result = await getClientPortalOverview(token);

  if (!result.overview) {
    return (
      <ClientPortalError message="Unable to load this project. Please contact your contractor." />
    );
  }

  return (
    <ClientPortalOverview session={session} overview={result.overview} />
  );
}
