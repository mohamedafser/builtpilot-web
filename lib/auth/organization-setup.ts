import { createAdminClient } from "@/lib/supabase/admin";
import type { OrganizationRole } from "@/lib/permissions/roles";
import { isInvitableRole } from "@/lib/permissions/roles";

export type SignupWorkspaceMetadata = {
  full_name?: string | null;
  business_name?: string | null;
  country_code?: string | null;
  language?: string | null;
};

export type WorkspaceSetupResult =
  | {
      ok: true;
      businessId: string;
      role: OrganizationRole;
      created: boolean;
    }
  | { ok: false; error: string };

function normalizeCountry(country?: string | null) {
  const value = (country ?? "IN").trim().toUpperCase();
  return value === "AE" ? "AE" : "IN";
}

function normalizeLanguage(language?: string | null) {
  const value = (language ?? "en").trim().toLowerCase();
  return ["en", "ta", "ar", "hi"].includes(value) ? value : "en";
}

function businessNameFromMetadata(metadata: SignupWorkspaceMetadata) {
  return (
    metadata.business_name?.trim() ||
    metadata.full_name?.trim() ||
    "My Business"
  );
}

export async function ensureUserWorkspace(
  userId: string,
  email: string,
  metadata: SignupWorkspaceMetadata = {},
): Promise<WorkspaceSetupResult> {
  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      error: "Server workspace setup is not configured. Set SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  const normalizedEmail = email.trim().toLowerCase();

  const { data: existingMembership, error: membershipError } = await admin
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    console.error("[auth:workspace-setup:membership]", membershipError.message);
    return { ok: false, error: "Unable to verify workspace membership." };
  }

  if (existingMembership) {
    return {
      ok: true,
      businessId: existingMembership.business_id,
      role: existingMembership.role as OrganizationRole,
      created: false,
    };
  }

  const { data: pendingInvite, error: inviteError } = await admin
    .from("business_invitations")
    .select("id, business_id, role")
    .eq("email", normalizedEmail)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (inviteError) {
    console.error("[auth:workspace-setup:invite]", inviteError.message);
    return { ok: false, error: "Unable to verify pending invitations." };
  }

  if (pendingInvite) {
    const invitedRole = pendingInvite.role as OrganizationRole;
    if (!isInvitableRole(invitedRole) && invitedRole !== "member") {
      return { ok: false, error: "Invalid invitation role." };
    }

    const { error: memberInsertError } = await admin
      .from("business_members")
      .insert({
        business_id: pendingInvite.business_id,
        user_id: userId,
        role: invitedRole,
      });

    if (memberInsertError) {
      console.error(
        "[auth:workspace-setup:invite-accept]",
        memberInsertError.message,
      );
      return { ok: false, error: "Unable to accept workspace invitation." };
    }

    await admin
      .from("business_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", pendingInvite.id);

    return {
      ok: true,
      businessId: pendingInvite.business_id,
      role: invitedRole,
      created: true,
    };
  }

  const { data: businessId, error: setupError } = await admin.rpc(
    "setup_owner_business",
    {
      target_user_id: userId,
      target_business_name: businessNameFromMetadata(metadata),
      target_country_code: normalizeCountry(metadata.country_code),
      target_language: normalizeLanguage(metadata.language),
    },
  );

  if (setupError || !businessId) {
    console.error("[auth:workspace-setup:owner]", setupError?.message);
    return { ok: false, error: "Unable to create your organization workspace." };
  }

  return {
    ok: true,
    businessId: businessId as string,
    role: "owner",
    created: true,
  };
}
