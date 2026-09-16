"use client";

import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  type Permission,
} from "@/lib/permissions/permissions";
import type { OrganizationRole } from "@/lib/permissions/roles";
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

type PermissionsContextValue = {
  role: OrganizationRole | null;
  ready: boolean;
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  canAll: (permissions: Permission[]) => boolean;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({
  role,
  children,
}: {
  role: OrganizationRole | null;
  children: ReactNode;
}) {
  const value = useMemo<PermissionsContextValue>(
    () => ({
      role,
      ready: true,
      can: (permission) => hasPermission(role, permission),
      canAny: (permissions) => hasAnyPermission(role, permissions),
      canAll: (permissions) => hasAllPermissions(role, permissions),
    }),
    [role],
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);

  if (!context) {
    return {
      role: null as OrganizationRole | null,
      ready: false,
      can: () => false,
      canAny: () => false,
      canAll: () => false,
    };
  }

  return context;
}

export function usePermission(permission: Permission) {
  const { can, ready } = usePermissions();
  return { allowed: ready && can(permission), ready };
}
