import type { MemberRole } from "@/types";

export const MEMBER_ROLES: readonly MemberRole[] = [
  "owner",
  "admin",
  "member",
] as const;

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};
