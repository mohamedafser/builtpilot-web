/**
 * Organization roles stored as lowercase in Postgres (`member_role` enum).
 * Display labels use title case (e.g. Owner, Project Manager).
 */
export const ORGANIZATION_ROLES = [
  "owner",
  "admin",
  "project_manager",
  "engineer",
  "site_supervisor",
  "worker",
  "member",
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

/** Roles that can be assigned through invitations (never owner). */
export const INVITABLE_ROLES = [
  "admin",
  "project_manager",
  "engineer",
  "site_supervisor",
  "worker",
] as const;

export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const ORGANIZATION_ROLE_LABELS: Record<OrganizationRole, string> = {
  owner: "Owner",
  admin: "Admin",
  project_manager: "Project Manager",
  engineer: "Engineer",
  site_supervisor: "Site Supervisor",
  worker: "Worker",
  member: "Member",
};

export const ROLE_HIERARCHY: OrganizationRole[] = [
  "owner",
  "admin",
  "project_manager",
  "engineer",
  "site_supervisor",
  "worker",
  "member",
];

export function isOrganizationRole(value: string): value is OrganizationRole {
  return ORGANIZATION_ROLES.includes(value as OrganizationRole);
}

export function isInvitableRole(value: string): value is InvitableRole {
  return INVITABLE_ROLES.includes(value as InvitableRole);
}

export function isOwnerRole(role: OrganizationRole | null | undefined): boolean {
  return role === "owner";
}

export function formatOrganizationRole(
  role: OrganizationRole | null | undefined,
): string {
  if (!role) {
    return "—";
  }
  return ORGANIZATION_ROLE_LABELS[role] ?? role;
}

export function rejectOwnerRoleAssignment(role: string): void {
  if (role === "owner") {
    throw new Error("Owner role cannot be assigned through invitations");
  }
}
