import { ClientPortalError } from "@/components/client-portal/client-portal-error";
import { ClientPortalShell } from "@/components/client-portal/client-portal-shell";
import { getClientPortalSession } from "@/lib/client-portal/queries";
import type { ReactNode } from "react";

export default async function ClientPortalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getClientPortalSession(token);

  if (session.status !== "ok") {
    return <ClientPortalError status={session.status} />;
  }

  return <ClientPortalShell session={session}>{children}</ClientPortalShell>;
}
