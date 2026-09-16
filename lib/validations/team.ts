import { INVITABLE_ROLES } from "@/lib/permissions/roles";
import { z } from "zod";

const emailSchema = z.string().trim().email("Enter a valid email address.");

const invitableRoleSchema = z.enum(INVITABLE_ROLES, {
  message: "Select a valid role.",
});

export const inviteTeamMemberSchema = z
  .object({
    email: emailSchema,
    role: invitableRoleSchema,
  })
  .strict();

export const updateTeamMemberRoleSchema = z
  .object({
    memberId: z.string().uuid("Invalid member id."),
    role: invitableRoleSchema,
  })
  .strict();

export type InviteTeamMemberValues = z.infer<typeof inviteTeamMemberSchema>;
export type UpdateTeamMemberRoleValues = z.infer<
  typeof updateTeamMemberRoleSchema
>;
