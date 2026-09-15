import { getProjectById } from "@/lib/projects/queries";
import { isProjectUuid } from "@/lib/projects/helpers";
import { createClient } from "@/lib/supabase/server";
import type { WhatsAppMessageRecord } from "@/lib/whatsapp/types";
import { evaluateWhatsAppEligibility } from "@/lib/whatsapp/send";

export type WhatsAppMessageListResult = {
  items: WhatsAppMessageRecord[];
  error: string | null;
};

export async function listProjectWhatsAppMessages(
  projectId: string,
  options?: { limit?: number },
): Promise<WhatsAppMessageListResult> {
  if (!isProjectUuid(projectId)) {
    return { items: [], error: "Project not found." };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      items: [],
      error:
        projectResult.error === "not_found"
          ? "Project not found."
          : projectResult.error,
    };
  }

  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 50);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select(
      "id, business_id, project_id, client_access_id, recipient_phone, message_type, template_name, content, provider_message_id, idempotency_key, status, error_code, error_message, retryable, sent_by, created_at, updated_at",
    )
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { items: [], error: "Unable to load message history." };
  }

  const senderIds = Array.from(
    new Set((data ?? []).map((row) => row.sent_by).filter(Boolean)),
  );

  const nameById = new Map<string, string>();

  if (senderIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", senderIds);

    for (const profile of profiles ?? []) {
      nameById.set(profile.id, profile.full_name ?? "Team member");
    }
  }

  return {
    items: (data ?? []).map((row) => ({
      ...row,
      message_type: row.message_type as WhatsAppMessageRecord["message_type"],
      status: row.status as WhatsAppMessageRecord["status"],
      sent_by_name: nameById.get(row.sent_by) ?? null,
    })),
    error: null,
  };
}

export async function getProjectCommunicationState(projectId: string) {
  if (!isProjectUuid(projectId)) {
    return { error: "not_found" as const, state: null };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return { error: "not_found" as const, state: null };
  }

  const supabase = await createClient();
  const { data: access, error } = await supabase
    .from("project_client_access")
    .select(
      "id, client_name, client_email, client_phone, whatsapp_enabled, whatsapp_phone, whatsapp_opted_in, whatsapp_opted_in_at, is_active, expires_at, last_accessed_at",
    )
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { error: error.message, state: null };
  }

  const eligibility = evaluateWhatsAppEligibility({
    access: access
      ? {
          whatsapp_enabled: access.whatsapp_enabled,
          whatsapp_phone: access.whatsapp_phone,
          client_phone: access.client_phone,
          whatsapp_opted_in: access.whatsapp_opted_in,
          is_active: access.is_active,
          expires_at: access.expires_at,
        }
      : null,
    requireActivePortal: true,
  });

  const messages = await listProjectWhatsAppMessages(projectId, { limit: 10 });

  return {
    error: null,
    state: {
      project_id: projectResult.project.id,
      project_name: projectResult.project.name,
      access: access
        ? {
            id: access.id,
            client_name: access.client_name,
            client_email: access.client_email,
            client_phone: access.client_phone,
            whatsapp_enabled: access.whatsapp_enabled,
            whatsapp_phone: access.whatsapp_phone,
            whatsapp_opted_in: access.whatsapp_opted_in,
            whatsapp_opted_in_at: access.whatsapp_opted_in_at,
            portal_active:
              access.is_active &&
              (!access.expires_at ||
                new Date(access.expires_at).getTime() > Date.now()),
            last_accessed_at: access.last_accessed_at,
          }
        : null,
      eligibility,
      recent_messages: messages.items,
    },
  };
}
