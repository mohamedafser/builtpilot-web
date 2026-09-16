"use client";

import { ForbiddenPanel } from "@/components/permissions/forbidden-panel";
import { permissionForPath } from "@/lib/permissions/permissions";
import { usePermissions } from "@/lib/permissions/permissions-context";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function ClientRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { can, ready } = usePermissions();
  const permission = permissionForPath(pathname);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-stone-500">
        Loading permissions...
      </div>
    );
  }

  if (permission && !can(permission)) {
    return <ForbiddenPanel />;
  }

  return children;
}
