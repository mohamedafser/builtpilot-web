import { ClientPortalHeader } from "@/components/client-portal/client-portal-header";
import { ClientPortalNav } from "@/components/client-portal/client-portal-nav";
import type { ClientPortalSession } from "@/lib/client-portal/types";
import type { ReactNode } from "react";

export function ClientPortalShell({
  session,
  children,
}: {
  session: ClientPortalSession;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-stone-50 pb-24 md:pb-10">
      <ClientPortalHeader session={session} />
      <ClientPortalNav session={session} />
      <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
