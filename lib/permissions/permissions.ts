import type { OrganizationRole } from "@/lib/permissions/roles";
import { isOwnerRole } from "@/lib/permissions/roles";

/**
 * Permission → roles that receive it.
 * OWNER always passes via hasPermission() bypass; listed for documentation.
 *
 * Roles use existing DB values (lowercase). There is no project_members table yet,
 * so "assigned projects" is enforced as business-scoped access + these permissions
 * until project assignment ships.
 */
export const PERMISSIONS = {
  "dashboard.view": [
    "owner",
    "admin",
    "project_manager",
    "engineer",
    "site_supervisor",
    "worker",
    "member",
  ],

  "organization.settings.view": ["owner", "admin"],
  "organization.settings.manage": ["owner", "admin"],
  "organization.users.view": ["owner", "admin"],
  "organization.users.manage": ["owner", "admin"],
  "organization.users.invite": ["owner", "admin"],
  "organization.roles.manage": ["owner", "admin"],
  "organization.billing.manage": ["owner"],
  "organization.transfer_ownership": ["owner"],
  "organization.delete": ["owner"],
  "organization.manage": ["owner"],

  "projects.view": [
    "owner",
    "admin",
    "project_manager",
    "engineer",
    "site_supervisor",
    "worker",
    "member",
  ],
  "projects.create": ["owner", "admin", "project_manager"],
  "projects.update": ["owner", "admin", "project_manager"],
  "projects.delete": ["owner", "admin", "project_manager"],
  "projects.manage": ["owner", "admin", "project_manager"],
  "projects.assign": ["owner", "admin", "project_manager"],

  "quotations.view": ["owner", "admin", "project_manager"],
  "quotations.create": ["owner", "admin", "project_manager"],
  "quotations.update": ["owner", "admin", "project_manager"],
  "quotations.delete": ["owner", "admin", "project_manager"],

  "boq.view": ["owner", "admin", "project_manager", "engineer"],
  "boq.create": ["owner", "admin", "project_manager", "engineer"],
  "boq.update": ["owner", "admin", "project_manager", "engineer"],
  "boq.delete": ["owner", "admin", "project_manager"],

  "materials.view": [
    "owner",
    "admin",
    "project_manager",
    "engineer",
    "site_supervisor",
  ],
  "materials.create": [
    "owner",
    "admin",
    "project_manager",
    "engineer",
    "site_supervisor",
  ],
  "materials.update": [
    "owner",
    "admin",
    "project_manager",
    "engineer",
    "site_supervisor",
  ],
  "materials.delete": ["owner", "admin", "project_manager"],
  "materials.receive": ["owner", "admin", "project_manager", "site_supervisor"],

  "labour.view": ["owner", "admin", "project_manager", "site_supervisor"],
  "labour.create": ["owner", "admin", "project_manager", "site_supervisor"],
  "labour.update": ["owner", "admin", "project_manager", "site_supervisor"],
  "labour.delete": ["owner", "admin", "project_manager"],

  "vendors.view": ["owner", "admin", "project_manager"],
  "vendors.create": ["owner", "admin", "project_manager"],
  "vendors.update": ["owner", "admin", "project_manager"],
  "vendors.delete": ["owner", "admin", "project_manager"],

  "tasks.view": [
    "owner",
    "admin",
    "project_manager",
    "engineer",
    "site_supervisor",
    "worker",
  ],
  "tasks.create": [
    "owner",
    "admin",
    "project_manager",
    "engineer",
    "site_supervisor",
  ],
  "tasks.update": [
    "owner",
    "admin",
    "project_manager",
    "engineer",
    "site_supervisor",
    "worker",
  ],
  "tasks.delete": ["owner", "admin", "project_manager"],

  "reports.view": ["owner", "admin", "project_manager", "site_supervisor"],
  "reports.create": ["owner", "admin", "project_manager", "site_supervisor"],
  "reports.update": ["owner", "admin", "project_manager", "site_supervisor"],

  "expenses.view": ["owner", "admin", "project_manager"],
  "expenses.create": ["owner", "admin", "project_manager"],
  "expenses.update": ["owner", "admin", "project_manager"],
  "expenses.delete": ["owner", "admin"],

  "ai.view": [
    "owner",
    "admin",
    "project_manager",
    "engineer",
    "site_supervisor",
  ],
  "ai.use": [
    "owner",
    "admin",
    "project_manager",
    "engineer",
    "site_supervisor",
  ],

  "account.view": [
    "owner",
    "admin",
    "project_manager",
    "engineer",
    "site_supervisor",
    "worker",
    "member",
  ],
} as const satisfies Record<string, readonly OrganizationRole[]>;

export type Permission = keyof typeof PERMISSIONS;

/** Navigation items → required permission to show the link. */
export const NAV_PERMISSIONS = {
  "/dashboard": "dashboard.view",
  "/ai": "ai.view",
  "/projects": "projects.view",
  "/quotations": "quotations.view",
  "/workers": "labour.view",
  "/materials": "materials.view",
  "/vendors": "vendors.view",
  "/settings": "organization.settings.view",
  "/account": "account.view",
} as const satisfies Record<string, Permission>;

/** Route prefixes → permission required to open the screen. */
export const ROUTE_PERMISSIONS: Array<{
  match: (pathname: string) => boolean;
  permission: Permission;
}> = [
  { match: (p) => p === "/dashboard" || p.startsWith("/dashboard/"), permission: "dashboard.view" },
  { match: (p) => p === "/ai" || p.startsWith("/ai/"), permission: "ai.view" },
  { match: (p) => p.startsWith("/settings"), permission: "organization.settings.view" },
  { match: (p) => p.startsWith("/account"), permission: "account.view" },
  { match: (p) => p.startsWith("/quotations"), permission: "quotations.view" },
  { match: (p) => p.startsWith("/workers"), permission: "labour.view" },
  { match: (p) => p.startsWith("/materials"), permission: "materials.view" },
  { match: (p) => p.startsWith("/vendors"), permission: "vendors.view" },
  {
    match: (p) => /\/projects\/[^/]+\/boq/.test(p),
    permission: "boq.view",
  },
  {
    match: (p) => /\/projects\/[^/]+\/labour/.test(p),
    permission: "labour.view",
  },
  {
    match: (p) => /\/projects\/[^/]+\/materials/.test(p),
    permission: "materials.view",
  },
  {
    match: (p) => /\/projects\/[^/]+\/quotations/.test(p),
    permission: "quotations.view",
  },
  {
    match: (p) => /\/projects\/[^/]+\/reports/.test(p),
    permission: "reports.view",
  },
  {
    match: (p) => /\/projects\/[^/]+\/expenses/.test(p),
    permission: "expenses.view",
  },
  {
    match: (p) => /\/projects\/[^/]+\/ai/.test(p),
    permission: "ai.view",
  },
  { match: (p) => p.startsWith("/projects"), permission: "projects.view" },
];

export function permissionForPath(pathname: string): Permission | null {
  for (const rule of ROUTE_PERMISSIONS) {
    if (rule.match(pathname)) {
      return rule.permission;
    }
  }
  return null;
}

export function hasRole(
  role: OrganizationRole | null | undefined,
  allowed: OrganizationRole | OrganizationRole[],
): boolean {
  if (!role) {
    return false;
  }

  if (isOwnerRole(role)) {
    return true;
  }

  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];
  return allowedRoles.includes(role);
}

export function hasPermission(
  role: OrganizationRole | null | undefined,
  permission: Permission,
): boolean {
  if (!role) {
    return false;
  }

  if (isOwnerRole(role)) {
    return true;
  }

  const allowed = PERMISSIONS[permission];
  if (!allowed) {
    return false;
  }

  return (allowed as readonly OrganizationRole[]).includes(role);
}

export function hasAnyPermission(
  role: OrganizationRole | null | undefined,
  permissions: Permission[],
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

export function hasAllPermissions(
  role: OrganizationRole | null | undefined,
  permissions: Permission[],
): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

export function requirePermission(
  role: OrganizationRole | null | undefined,
  permission: Permission,
): { ok: true } | { ok: false; message: string } {
  if (!hasPermission(role, permission)) {
    return { ok: false, message: "You do not have permission for this action." };
  }
  return { ok: true };
}

/** Permissions granted to a role (for debugging / docs). Owner returns all keys. */
export function permissionsForRole(
  role: OrganizationRole | null | undefined,
): Permission[] {
  if (!role) {
    return [];
  }

  const keys = Object.keys(PERMISSIONS) as Permission[];
  if (isOwnerRole(role)) {
    return keys;
  }

  return keys.filter((permission) => hasPermission(role, permission));
}
