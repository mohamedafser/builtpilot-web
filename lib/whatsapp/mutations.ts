import { getCurrentUser } from "@/lib/auth";
import { getProjectById } from "@/lib/projects/queries";
import { isProjectUuid, emptyToNull } from "@/lib/projects/helpers";
import { createClient } from "@/lib/supabase/server";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp/validation";
import { z } from "zod";
import { getZodErrorMessage } from "@/lib/validations/error";

export const whatsappSettingsSchema = z.object({
  whatsapp_enabled: z.boolean(),
  whatsapp_phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("")),
  whatsapp_opted_in: z.boolean(),
  client_phone: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal("")),
});

export type WhatsAppSettingsValues = z.infer<typeof whatsappSettingsSchema>;

export async function updateProjectWhatsAppSettings(
  projectId: string,
  values: unknown,
): Promise<{ error: string; status?: number } | { success: true }> {
  if (!isProjectUuid(projectId)) {
    return { error: "Project not found.", status: 404 };
  }

  const parsed = whatsappSettingsSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Invalid WhatsApp settings."),
    };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "You must be signed in to continue.", status: 401 };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      error:
        projectResult.error === "not_found"
          ? "Project not found."
          : projectResult.error,
      status: projectResult.error === "not_found" ? 404 : 400,
    };
  }

  const phoneRaw =
    parsed.data.whatsapp_phone?.trim() ||
    parsed.data.client_phone?.trim() ||
    "";

  let normalizedPhone: string | null = null;

  if (parsed.data.whatsapp_enabled || parsed.data.whatsapp_opted_in) {
    if (!phoneRaw) {
      return { error: "Please enter a valid WhatsApp number." };
    }

    const phone = normalizeWhatsAppPhone(phoneRaw);

    if (!phone.ok) {
      return { error: phone.error };
    }

    normalizedPhone = phone.e164;
  } else if (phoneRaw) {
    const phone = normalizeWhatsAppPhone(phoneRaw);
    if (!phone.ok) {
      return { error: phone.error };
    }
    normalizedPhone = phone.e164;
  }

  const supabase = await createClient();
  const { data: access } = await supabase
    .from("project_client_access")
    .select("id, whatsapp_opted_in, whatsapp_opted_in_at")
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!access) {
    return {
      error: "Enable the client portal before configuring WhatsApp updates.",
      status: 400,
    };
  }

  const optedIn = parsed.data.whatsapp_enabled && parsed.data.whatsapp_opted_in;

  const patch: {
    whatsapp_enabled: boolean;
    whatsapp_phone: string | null;
    whatsapp_opted_in: boolean;
    whatsapp_opted_in_at: string | null;
    client_phone: string | null;
  } = {
    whatsapp_enabled: optedIn,
    whatsapp_phone: normalizedPhone,
    whatsapp_opted_in: optedIn,
    whatsapp_opted_in_at: optedIn
      ? access.whatsapp_opted_in && access.whatsapp_opted_in_at
        ? access.whatsapp_opted_in_at
        : new Date().toISOString()
      : null,
    client_phone: emptyToNull(parsed.data.client_phone) ?? normalizedPhone,
  };

  const { error } = await supabase
    .from("project_client_access")
    .update(patch)
    .eq("id", access.id);

  if (error) {
    return { error: "Unable to save WhatsApp settings." };
  }

  return { success: true };
}
