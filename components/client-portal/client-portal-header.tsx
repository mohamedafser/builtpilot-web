import { Logo } from "@/components/layout/logo";
import { clientPortalHomePath } from "@/lib/client-portal/helpers";
import type { ClientPortalSession } from "@/lib/client-portal/types";

export function ClientPortalHeader({
  session,
}: {
  session: ClientPortalSession;
}) {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Logo href={clientPortalHomePath(session.base)} />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-stone-900">
            {session.project.name}
          </p>
          <p className="truncate text-sm text-stone-500">
            {session.access.client_name}
            {session.businessName ? ` · ${session.businessName}` : ""}
          </p>
        </div>
      </div>
      {session.isPreview ? (
        <div className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
          You are previewing the client portal. This is not the public link.
        </div>
      ) : null}
    </header>
  );
}
