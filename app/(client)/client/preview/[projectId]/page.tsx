import { ClientPortalError } from "@/components/client-portal/client-portal-error";
import { ClientPortalOverview } from "@/components/client-portal/client-portal-overview";
import {
  getPreviewClientPortalOverview,
  getPreviewClientPortalSession,
} from "@/lib/client-portal/queries";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { projectId } = await params;
  const session = await getPreviewClientPortalSession(projectId);

  if (session.status !== "ok") {
    return { title: "Client portal preview" };
  }

  return { title: `Preview · ${session.project.name}` };
}

export default async function PreviewHomePage({ params }: PageProps) {
  const { projectId } = await params;
  const session = await getPreviewClientPortalSession(projectId);

  if (session.status !== "ok") {
    return null;
  }

  const result = await getPreviewClientPortalOverview(projectId);

  if (!result.overview) {
    return (
      <ClientPortalError message="Unable to load this project. Please contact your contractor." />
    );
  }

  return <ClientPortalOverview session={session} overview={result.overview} />;
}
