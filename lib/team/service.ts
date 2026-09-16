import { createHash, randomBytes } from "node:crypto";
import { ensureUserWorkspace } from "@/lib/auth/organization-setup";
import { getAppBaseUrl } from "@/lib/app-url";
import { sendEmail } from "@/lib/email/send";
import {
  hasPermission,
  isInvitableRole,
  rejectOwnerRoleAssignment,
  type OrganizationRole,
} from "@/lib/permissions";
import { buildInviteSignupPath } from "@/lib/team/invite-token";
import { buildTeamInviteEmailTemplate } from "@/lib/team/invite-email-template";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  inviteTeamMemberSchema,
  updateTeamMemberRoleSchema,
} from "@/lib/validations/team";
import { getZodErrorMessage } from "@/lib/validations/error";
import type { User } from "@supabase/supabase-js";

export type TeamServiceError = {
  ok: false;
  message: string;
  status: number;
};

export type TeamServiceSuccess<T> = {
  ok: true;
  data: T;
};

export type TeamServiceResult<T> = TeamServiceSuccess<T> | TeamServiceError;

function fail(message: string, status = 400): TeamServiceError {
  return { ok: false, message, status };
}

function ok<T>(data: T): TeamServiceSuccess<T> {
  return { ok: true, data };
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Pending invitations expire after 2 days. */
export const INVITATION_EXPIRY_DAYS = 2;

function invitationExpiresAt(from = Date.now()) {
  return new Date(
    from + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

async function sendInviteEmail(input: {
  user: User;
  businessName: string;
  email: string;
  role: OrganizationRole;
  origin?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: inviterProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", input.user.id)
    .maybeSingle();

  const baseUrl = (input.origin?.trim() || getAppBaseUrl()).replace(/\/$/, "");
  const signupPath = buildInviteSignupPath(input.email, input.businessName);
  const signupUrl = `${baseUrl}${signupPath}`;

  const template = buildTeamInviteEmailTemplate({
    organizationName: input.businessName,
    role: input.role,
    inviterName: inviterProfile?.full_name ?? input.user.email ?? "A team member",
    inviteeEmail: input.email,
    signupUrl,
    expiresInDays: INVITATION_EXPIRY_DAYS,
  });

  return sendEmail({
    to: input.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
    replyTo: input.user.email ?? null,
  });
}

export async function getTeamContext(user: User) {
  const supabase = await createClient();

  const { data: membership, error: membershipError } = await supabase
    .from("business_members")
    .select("id, role, business_id, businesses(id, name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    return null;
  }

  const business = membership.businesses;
  const businessRecord = Array.isArray(business) ? business[0] : business;

  return {
    membershipId: membership.id,
    role: membership.role as OrganizationRole,
    businessId: membership.business_id,
    businessName: businessRecord?.name ?? "Workspace",
  };
}

export async function listTeamMembers(
  user: User,
): Promise<
  TeamServiceResult<{
    members: Array<{
      id: string;
      userId: string;
      role: OrganizationRole;
      fullName: string | null;
      email: string | null;
      createdAt: string;
    }>;
    invitations: Array<{
      id: string;
      email: string;
      role: OrganizationRole;
      expiresAt: string;
      createdAt: string;
    }>;
  }>
> {
  const context = await getTeamContext(user);
  if (!context) {
    return fail("No business workspace found.", 403);
  }

  if (!hasPermission(context.role, "organization.users.view")) {
    return fail("You do not have permission to view team members.", 403);
  }

  const supabase = await createClient();

  const [{ data: members, error: membersError }, { data: invitations, error: invitesError }] =
    await Promise.all([
      supabase
        .from("business_members")
        .select(
          "id, user_id, role, created_at, profiles(full_name, id)",
        )
        .eq("business_id", context.businessId)
        .order("created_at", { ascending: true }),
      supabase
        .from("business_invitations")
        .select("id, email, role, expires_at, created_at")
        .eq("business_id", context.businessId)
        .is("accepted_at", null)
        .order("created_at", { ascending: false }),
    ]);

  if (membersError || invitesError) {
    console.error("[team:list]", membersError?.message ?? invitesError?.message);
    return fail("Unable to load team members.", 500);
  }

  const admin = createAdminClient();
  const memberRows = await Promise.all(
    (members ?? []).map(async (member) => {
      let email: string | null = null;
      if (admin) {
        const { data } = await admin.auth.admin.getUserById(member.user_id);
        email = data.user?.email ?? null;
      }

      const profile = member.profiles;
      const profileRecord = Array.isArray(profile) ? profile[0] : profile;

      return {
        id: member.id,
        userId: member.user_id,
        role: member.role as OrganizationRole,
        fullName: profileRecord?.full_name ?? null,
        email,
        createdAt: member.created_at,
      };
    }),
  );

  return ok({
    members: memberRows,
    invitations: (invitations ?? []).map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role as OrganizationRole,
      expiresAt: invite.expires_at,
      createdAt: invite.created_at,
    })),
  });
}

export async function inviteTeamMember(
  user: User,
  values: unknown,
  options?: { origin?: string },
): Promise<TeamServiceResult<{ email: string; role: OrganizationRole }>> {
  const parsed = inviteTeamMemberSchema.safeParse(values);
  if (!parsed.success) {
    return fail(getZodErrorMessage(parsed.error, "Invalid invitation details."));
  }

  try {
    rejectOwnerRoleAssignment(parsed.data.role);
  } catch (error) {
    return fail(
      error instanceof Error
        ? error.message
        : "Owner role cannot be assigned through invitations",
      403,
    );
  }

  const context = await getTeamContext(user);
  if (!context) {
    return fail("No business workspace found.", 403);
  }

  if (!hasPermission(context.role, "organization.users.invite")) {
    return fail("You do not have permission to invite users.", 403);
  }

  const email = parsed.data.email.trim().toLowerCase();
  const role = parsed.data.role;

  if (!isInvitableRole(role)) {
    return fail("Invalid invitation role.", 400);
  }

  const supabase = await createClient();
  const token = randomBytes(24).toString("hex");
  const expiresAt = invitationExpiresAt();

  await supabase
    .from("business_invitations")
    .delete()
    .eq("business_id", context.businessId)
    .eq("email", email)
    .is("accepted_at", null);

  const { data: insertedInvite, error } = await supabase
    .from("business_invitations")
    .insert({
      business_id: context.businessId,
      email,
      role,
      invited_by: user.id,
      token_hash: hashInviteToken(token),
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error || !insertedInvite) {
    console.error("[team:invite]", error?.message);
    return fail("Unable to create invitation.", 400);
  }

  const emailResult = await sendInviteEmail({
    user,
    businessName: context.businessName,
    email,
    role,
    origin: options?.origin,
  });

  if (!emailResult.ok) {
    await supabase
      .from("business_invitations")
      .delete()
      .eq("id", insertedInvite.id);

    console.error("[team:invite:email]", emailResult.error);
    return fail(
      emailResult.error ||
        "Invitation email could not be sent. Check SMTP settings and try again.",
      503,
    );
  }

  return ok({ email, role });
}

export async function cancelInvitation(
  user: User,
  invitationId: string,
): Promise<TeamServiceResult<{ invitationId: string }>> {
  const context = await getTeamContext(user);
  if (!context) {
    return fail("No business workspace found.", 403);
  }

  if (!hasPermission(context.role, "organization.users.manage")) {
    return fail("You do not have permission to cancel invitations.", 403);
  }

  const supabase = await createClient();
  const { data: invitation, error: lookupError } = await supabase
    .from("business_invitations")
    .select("id, business_id, accepted_at")
    .eq("id", invitationId)
    .maybeSingle();

  if (lookupError || !invitation) {
    return fail("Invitation not found.", 404);
  }

  if (invitation.business_id !== context.businessId) {
    return fail("Invitation not found.", 404);
  }

  if (invitation.accepted_at) {
    return fail("This invitation has already been accepted.", 400);
  }

  const { error } = await supabase
    .from("business_invitations")
    .delete()
    .eq("id", invitationId);

  if (error) {
    console.error("[team:cancel-invite]", error.message);
    return fail("Unable to cancel invitation.", 400);
  }

  return ok({ invitationId });
}

export async function resendInvitation(
  user: User,
  invitationId: string,
  options?: { origin?: string },
): Promise<TeamServiceResult<{ email: string; role: OrganizationRole }>> {
  const context = await getTeamContext(user);
  if (!context) {
    return fail("No business workspace found.", 403);
  }

  if (!hasPermission(context.role, "organization.users.invite")) {
    return fail("You do not have permission to resend invitations.", 403);
  }

  const supabase = await createClient();
  const { data: invitation, error: lookupError } = await supabase
    .from("business_invitations")
    .select("id, business_id, email, role, accepted_at")
    .eq("id", invitationId)
    .maybeSingle();

  if (lookupError || !invitation) {
    return fail("Invitation not found.", 404);
  }

  if (invitation.business_id !== context.businessId) {
    return fail("Invitation not found.", 404);
  }

  if (invitation.accepted_at) {
    return fail("This invitation has already been accepted.", 400);
  }

  const role = invitation.role as OrganizationRole;
  if (!isInvitableRole(role) && role !== "member") {
    return fail("Invalid invitation role.", 400);
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = invitationExpiresAt();

  const { error: updateError } = await supabase
    .from("business_invitations")
    .update({
      token_hash: hashInviteToken(token),
      expires_at: expiresAt,
      invited_by: user.id,
    })
    .eq("id", invitationId);

  if (updateError) {
    console.error("[team:resend-invite]", updateError.message);
    return fail("Unable to refresh invitation.", 400);
  }

  const emailResult = await sendInviteEmail({
    user,
    businessName: context.businessName,
    email: invitation.email,
    role,
    origin: options?.origin,
  });

  if (!emailResult.ok) {
    console.error("[team:resend-invite:email]", emailResult.error);
    return fail(
      emailResult.error ||
        "Invitation email could not be sent. Check SMTP settings and try again.",
      503,
    );
  }

  return ok({ email: invitation.email, role });
}

export async function updateTeamMemberRole(
  user: User,
  values: unknown,
): Promise<TeamServiceResult<{ memberId: string; role: OrganizationRole }>> {
  const parsed = updateTeamMemberRoleSchema.safeParse(values);
  if (!parsed.success) {
    return fail(getZodErrorMessage(parsed.error, "Invalid role update."));
  }

  try {
    rejectOwnerRoleAssignment(parsed.data.role);
  } catch (error) {
    return fail(
      error instanceof Error
        ? error.message
        : "Owner role cannot be assigned through member updates",
      403,
    );
  }

  const context = await getTeamContext(user);
  if (!context) {
    return fail("No business workspace found.", 403);
  }

  if (!hasPermission(context.role, "organization.roles.manage")) {
    return fail("You do not have permission to change member roles.", 403);
  }

  const supabase = await createClient();
  const { data: target, error: targetError } = await supabase
    .from("business_members")
    .select("id, user_id, role, business_id")
    .eq("id", parsed.data.memberId)
    .maybeSingle();

  if (targetError || !target) {
    return fail("Team member not found.", 404);
  }

  if (target.business_id !== context.businessId) {
    return fail("Team member not found.", 404);
  }

  if (target.role === "owner") {
    return fail("Owner role cannot be changed through this action.", 403);
  }

  if (target.user_id === user.id) {
    return fail("You cannot change your own role.", 403);
  }

  const { error } = await supabase
    .from("business_members")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.memberId);

  if (error) {
    console.error("[team:update-role]", error.message);
    return fail("Unable to update member role.", 400);
  }

  return ok({ memberId: parsed.data.memberId, role: parsed.data.role });
}

export async function removeTeamMember(
  user: User,
  memberId: string,
): Promise<TeamServiceResult<{ memberId: string }>> {
  const context = await getTeamContext(user);
  if (!context) {
    return fail("No business workspace found.", 403);
  }

  if (!hasPermission(context.role, "organization.users.manage")) {
    return fail("You do not have permission to remove team members.", 403);
  }

  const supabase = await createClient();
  const { data: target, error: targetError } = await supabase
    .from("business_members")
    .select("id, user_id, role, business_id")
    .eq("id", memberId)
    .maybeSingle();

  if (targetError || !target) {
    return fail("Team member not found.", 404);
  }

  if (target.business_id !== context.businessId) {
    return fail("Team member not found.", 404);
  }

  if (target.role === "owner") {
    return fail("The organization owner cannot be removed.", 403);
  }

  if (target.user_id === user.id) {
    return fail("You cannot remove yourself.", 403);
  }

  const { error } = await supabase
    .from("business_members")
    .delete()
    .eq("id", memberId);

  if (error) {
    console.error("[team:remove]", error.message);
    return fail("Unable to remove team member.", 400);
  }

  return ok({ memberId });
}

export async function ensureWorkspaceForAuthenticatedUser(
  user: User,
): Promise<TeamServiceResult<{ businessId: string; role: OrganizationRole }>> {
  const metadata = user.user_metadata ?? {};
  const result = await ensureUserWorkspace(user.id, user.email ?? "", {
    full_name:
      typeof metadata.full_name === "string" ? metadata.full_name : null,
    business_name:
      typeof metadata.business_name === "string" ? metadata.business_name : null,
    country_code:
      typeof metadata.country_code === "string" ? metadata.country_code : null,
    language: typeof metadata.language === "string" ? metadata.language : null,
  });

  if (!result.ok) {
    return fail(result.error, 500);
  }

  return ok({ businessId: result.businessId, role: result.role });
}
