import { ForbiddenPanel } from "@/components/permissions/forbidden-panel";
import { getWorkspaceContext } from "@/lib/auth";
import {
  hasPermission,
  permissionForPath,
  type Permission,
} from "@/lib/permissions/permissions";
import type { ReactElement } from "react";

export async function requirePagePermission(
  permission: Permission,
): Promise<{ ok: true } | { ok: false; panel: ReactElement }> {
  const { role } = await getWorkspaceContext();

  if (!hasPermission(role, permission)) {
    return { ok: false, panel: <ForbiddenPanel /> };
  }

  return { ok: true };
}

export async function requirePathPermission(
  pathname: string,
): Promise<{ ok: true } | { ok: false; panel: ReactElement }> {
  const permission = permissionForPath(pathname);
  if (!permission) {
    return { ok: true };
  }
  return requirePagePermission(permission);
}
