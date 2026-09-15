import { ClientPortalError } from "@/components/client-portal/client-portal-error";
import { ClientPortalShell } from "@/components/client-portal/client-portal-shell";
import { requireUser } from "@/lib/auth";
import { getPreviewClientPortalSession } from "@/lib/client-portal/queries";
import type { ReactNode } from "react";

export default async function ClientPortalPreviewLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  await requireUser();
  const { projectId } = await params;
  const session = await getPreviewClientPortalSession(projectId);

  if (session.status !== "ok") {
    return (
      <ClientPortalError message="Enable the client portal to preview it." />
    );
  }

  return <ClientPortalShell session={session}>{children}</ClientPortalShell>;
}
