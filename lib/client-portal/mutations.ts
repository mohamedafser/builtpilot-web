import { getCurrentUser } from "@/lib/auth";
import { contractorPortalErrorMessage } from "@/lib/client-portal/helpers";
import {
  DEFAULT_CLIENT_PORTAL_SETTINGS,
  pickClientPortalSettings,
} from "@/lib/client-portal/permissions";
import {
  generateClientPortalToken,
  hashClientPortalToken,
} from "@/lib/client-portal/tokens";
import type { ClientPortalSettings } from "@/lib/client-portal/types";
import { getContractorClientPortal } from "@/lib/client-portal/queries";
import { emptyToNull, isProjectUuid } from "@/lib/projects/helpers";
import { getProjectById } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/types";
import {
  clientPortalEnableSchema,
  clientPortalUpdateSchema,
} from "@/lib/validations/client-portal";
import { getZodErrorMessage } from "@/lib/validations/error";

export type ClientPortalMutationResult =
  { error: string; status?: number } | { success: true; token?: string };

async function scopedProject(
  projectId: string,
): Promise<
  | { ok: true; project: Project }
  | { ok: false; error: string; status: 400 | 401 | 404 }
> {
  if (!isProjectUuid(projectId)) {
    return { ok: false, error: "Project not found.", status: 404 };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      ok: false,
      error:
        projectResult.error === "not_found"
          ? "Project not found."
          : projectResult.error,
      status: projectResult.error === "not_found" ? 404 : 400,
    };
  }

  return { ok: true, project: projectResult.project };
}

async function latestAccessId(
  projectId: string,
  businessId: string,
): Promise<{ id: string } | null | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_client_access")
    .select("id")
    .eq("project_id", projectId)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { error: contractorPortalErrorMessage(error) };
  }

  return data;
}

async function upsertSettings(
  projectId: string,
  businessId: string,
  settings: Partial<ClientPortalSettings>,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const payload = {
    ...DEFAULT_CLIENT_PORTAL_SETTINGS,
    ...pickClientPortalSettings(settings),
    business_id: businessId,
    project_id: projectId,
  };

  const { error } = await supabase
    .from("project_client_settings")
    .upsert(payload, { onConflict: "project_id" });

  if (error) {
    return { error: contractorPortalErrorMessage(error) };
  }

  return { success: true };
}

export async function enableClientPortal(
  projectId: string,
  values: unknown,
): Promise<ClientPortalMutationResult> {
  const scoped = await scopedProject(projectId);

  if (!scoped.ok) {
    return { error: scoped.error, status: scoped.status };
  }

  const parsed = clientPortalEnableSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Invalid client portal details."),
    };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "You must be signed in to continue.", status: 401 };
  }

  const settingsResult = await upsertSettings(
    scoped.project.id,
    scoped.project.business_id,
    parsed.data,
  );

  if ("error" in settingsResult) {
    return settingsResult;
  }

  const existing = await latestAccessId(
    scoped.project.id,
    scoped.project.business_id,
  );

  if (existing && "error" in existing) {
    return existing;
  }

  const supabase = await createClient();
  const contact = {
    client_name: parsed.data.client_name,
    client_email: emptyToNull(parsed.data.client_email),
    client_phone: emptyToNull(parsed.data.client_phone),
  };

  if (existing) {
    const { error } = await supabase
      .from("project_client_access")
      .update({
        ...contact,
        is_active: true,
      })
      .eq("id", existing.id)
      .eq("business_id", scoped.project.business_id);

    if (error) {
      return { error: contractorPortalErrorMessage(error) };
    }

    return { success: true };
  }

  const token = generateClientPortalToken();
  const { error } = await supabase.from("project_client_access").insert({
    business_id: scoped.project.business_id,
    project_id: scoped.project.id,
    created_by: user.id,
    access_token_hash: hashClientPortalToken(token),
    is_active: true,
    ...contact,
  });

  if (error) {
    return { error: contractorPortalErrorMessage(error) };
  }

  return { success: true, token };
}

export async function updateClientPortal(
  projectId: string,
  values: unknown,
): Promise<ClientPortalMutationResult> {
  const scoped = await scopedProject(projectId);

  if (!scoped.ok) {
    return { error: scoped.error, status: scoped.status };
  }

  const parsed = clientPortalUpdateSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Invalid client portal details."),
    };
  }

  const { client_name, client_email, client_phone, ...settings } = parsed.data;

  if (Object.keys(settings).length > 0) {
    const current = await getContractorClientPortal(projectId);
    const settingsResult = await upsertSettings(
      scoped.project.id,
      scoped.project.business_id,
      {
        ...(current.state?.settings ?? DEFAULT_CLIENT_PORTAL_SETTINGS),
        ...settings,
      },
    );

    if ("error" in settingsResult) {
      return settingsResult;
    }
  }

  if (
    client_name !== undefined ||
    client_email !== undefined ||
    client_phone !== undefined
  ) {
    const existing = await latestAccessId(
      scoped.project.id,
      scoped.project.business_id,
    );

    if (existing && "error" in existing) {
      return existing;
    }

    if (existing) {
      const supabase = await createClient();
      const { error } = await supabase
        .from("project_client_access")
        .update({
          ...(client_name !== undefined ? { client_name } : {}),
          ...(client_email !== undefined
            ? { client_email: emptyToNull(client_email) }
            : {}),
          ...(client_phone !== undefined
            ? { client_phone: emptyToNull(client_phone) }
            : {}),
        })
        .eq("id", existing.id)
        .eq("business_id", scoped.project.business_id);

      if (error) {
        return { error: contractorPortalErrorMessage(error) };
      }
    }
  }

  return { success: true };
}

export async function regenerateClientPortalLink(
  projectId: string,
): Promise<ClientPortalMutationResult> {
  const scoped = await scopedProject(projectId);

  if (!scoped.ok) {
    return { error: scoped.error, status: scoped.status };
  }

  const existing = await latestAccessId(
    scoped.project.id,
    scoped.project.business_id,
  );

  if (existing && "error" in existing) {
    return existing;
  }

  if (!existing) {
    return { error: "Enable the client portal before regenerating a link." };
  }

  const token = generateClientPortalToken();
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_client_access")
    .update({
      access_token_hash: hashClientPortalToken(token),
      is_active: true,
      expires_at: null,
    })
    .eq("id", existing.id)
    .eq("business_id", scoped.project.business_id);

  if (error) {
    return { error: contractorPortalErrorMessage(error) };
  }

  return { success: true, token };
}

export async function setClientPortalActive(
  projectId: string,
  isActive: boolean,
): Promise<ClientPortalMutationResult> {
  const scoped = await scopedProject(projectId);

  if (!scoped.ok) {
    return { error: scoped.error, status: scoped.status };
  }

  const existing = await latestAccessId(
    scoped.project.id,
    scoped.project.business_id,
  );

  if (existing && "error" in existing) {
    return existing;
  }

  if (!existing) {
    return { error: "Enable the client portal first." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("project_client_access")
    .update({ is_active: isActive })
    .eq("id", existing.id)
    .eq("business_id", scoped.project.business_id);

  if (error) {
    return { error: contractorPortalErrorMessage(error) };
  }

  return { success: true };
}
