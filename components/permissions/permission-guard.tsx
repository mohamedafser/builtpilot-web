import { ForbiddenPanel } from "@/components/permissions/forbidden-panel";
import { getWorkspaceContext } from "@/lib/auth";
import {
  hasPermission,
  type Permission,
} from "@/lib/permissions/permissions";
import type { ReactNode } from "react";

/**
 * Server-side screen guard. Renders forbidden UI when the membership role
 * lacks the required permission. Does not replace API/RLS checks.
 */
export async function PermissionGuard({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const { role } = await getWorkspaceContext();

  if (!hasPermission(role, permission)) {
    return <ForbiddenPanel />;
  }

  return children;
}
