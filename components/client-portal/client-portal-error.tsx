import { Logo } from "@/components/layout/logo";
import { portalAccessMessage } from "@/lib/client-portal/helpers";
import type { ClientPortalAccessStatus } from "@/lib/client-portal/types";

export function ClientPortalError({
  status,
  message,
}: {
  status?: Exclude<ClientPortalAccessStatus, "ok">;
  message?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-stone-50 px-6 py-16 text-center">
      <Logo href="#" />
      <h1 className="mt-8 max-w-md text-xl font-semibold text-stone-900">
        {message ?? (status ? portalAccessMessage(status) : "Unable to load this project. Please contact your contractor.")}
      </h1>
      <p className="mt-3 max-w-md text-sm text-stone-500">
        If you believe this is a mistake, ask your contractor for an updated
        link.
      </p>
    </div>
  );
}
