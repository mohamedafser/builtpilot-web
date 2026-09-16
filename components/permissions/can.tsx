"use client";

import { usePermissions } from "@/lib/permissions/permissions-context";
import type { Permission } from "@/lib/permissions/permissions";
import type { ReactNode } from "react";

/**
 * Conditionally render children when the current role has the permission.
 * Renders nothing while permissions are not ready (avoids privileged flicker).
 */
export function Can({
  permission,
  permissions,
  mode = "all",
  fallback = null,
  children,
}: {
  permission?: Permission;
  permissions?: Permission[];
  mode?: "all" | "any";
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { can, canAny, canAll, ready } = usePermissions();

  if (!ready) {
    return fallback;
  }

  const allowed = permission
    ? can(permission)
    : permissions
      ? mode === "any"
        ? canAny(permissions)
        : canAll(permissions)
      : false;

  if (!allowed) {
    return fallback;
  }

  return children;
}
