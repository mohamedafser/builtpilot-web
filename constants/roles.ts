import {
  INVITABLE_ROLES,
  ORGANIZATION_ROLE_LABELS,
  ORGANIZATION_ROLES,
  type InvitableRole,
  type OrganizationRole,
} from "@/lib/permissions/roles";

export type { InvitableRole, OrganizationRole };

export const MEMBER_ROLES = ORGANIZATION_ROLES;
export const MEMBER_ROLE_LABELS = ORGANIZATION_ROLE_LABELS;
export { ORGANIZATION_ROLE_LABELS };
export const INVITE_ROLES = INVITABLE_ROLES;
