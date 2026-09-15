import { getCurrentUser } from "@/lib/auth";
import { definitionToSavePayload } from "@/lib/quotation-templates/save-payload";
import {
  emptyToNull,
  getQuotationErrorMessage,
  type QuotationMutationResult,
} from "@/lib/quotations/helpers";
import { getWorkspaceScope } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import { getZodErrorMessage } from "@/lib/validations/error";
import {
  saveQuotationTemplateSchema,
  type SaveQuotationTemplateInput,
} from "@/lib/validations/quotation-template";
import type { Json } from "@/types/database";

export { definitionToSavePayload };

export async function saveQuotationTemplate(
  input: SaveQuotationTemplateInput,
): Promise<QuotationMutationResult> {
  const parsed = saveQuotationTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Invalid template details."),
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in to continue.", status: 401 };
  }

  const scope = await getWorkspaceScope();
  if (!scope.ok) {
    return { error: scope.message, status: 403 };
  }

  const payload = parsed.data.payload;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotation_templates")
    .insert({
      business_id: scope.business.id,
      name: parsed.data.name,
      country_code: payload.countryCode,
      currency_code: payload.currencyCode,
      project_type: payload.projectType,
      description: emptyToNull(payload.description),
      payload: payload as unknown as Json,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      error: error
        ? getQuotationErrorMessage(error)
        : "Unable to save template.",
    };
  }

  return { success: true, id: data.id };
}

export async function deleteQuotationTemplate(
  templateId: string,
): Promise<QuotationMutationResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in to continue.", status: 401 };
  }

  const scope = await getWorkspaceScope();
  if (!scope.ok) {
    return { error: scope.message, status: 403 };
  }

  const id = templateId.startsWith("custom:")
    ? templateId.slice("custom:".length)
    : templateId;

  const supabase = await createClient();
  const { error } = await supabase
    .from("quotation_templates")
    .delete()
    .eq("business_id", scope.business.id)
    .eq("id", id);

  if (error) {
    return { error: getQuotationErrorMessage(error) };
  }

  return { success: true, id };
}
