import {
  getBuiltinTemplate,
  listBuiltinTemplates,
} from "@/lib/quotation-templates/defaults/catalog";
import type {
  QuotationTemplateDefinition,
  QuotationTemplateSummary,
} from "@/lib/quotation-templates/types";
import { getQuotationErrorMessage } from "@/lib/quotations/helpers";
import { createClient } from "@/lib/supabase/server";
import { quotationTemplatePayloadSchema } from "@/lib/validations/quotation-template";
import type { QuotationTemplate } from "@/types/database";

/** Normalize custom rows into the same shape as built-in templates. */
export function customRowToDefinition(
  row: QuotationTemplate,
): QuotationTemplateDefinition | null {
  const parsed = quotationTemplatePayloadSchema.safeParse({
    ...(typeof row.payload === "object" && row.payload !== null
      ? (row.payload as Record<string, unknown>)
      : {}),
    name: row.name,
    description: row.description ?? "",
    countryCode: row.country_code,
    currencyCode: row.currency_code,
    projectType: row.project_type,
    source: "custom",
  });

  if (!parsed.success) {
    return null;
  }

  return {
    id: `custom:${row.id}`,
    name: parsed.data.name,
    description: parsed.data.description,
    countryCode: parsed.data.countryCode,
    currencyCode: parsed.data.currencyCode,
    projectType: parsed.data.projectType,
    referenceAreaSqFt: parsed.data.referenceAreaSqFt,
    qualityLevels: parsed.data.qualityLevels,
    defaultQualityId: parsed.data.defaultQualityId,
    materials: parsed.data.materials,
    labour: parsed.data.labour,
    otherCosts: parsed.data.otherCosts,
    includedItems: parsed.data.includedItems,
    excludedItems: parsed.data.excludedItems,
    addons: parsed.data.addons,
    defaultTaxPercentage: parsed.data.defaultTaxPercentage,
    defaultContingencyPercentage: parsed.data.defaultContingencyPercentage,
    defaultDiscountPercentage: parsed.data.defaultDiscountPercentage,
    defaultNotes: parsed.data.defaultNotes,
    defaultTerms: parsed.data.defaultTerms,
    source: "custom",
  };
}

export async function listQuotationTemplates(options: {
  businessId: string;
  countryCode?: string | null;
}): Promise<{
  templates: QuotationTemplateSummary[];
  error: string | null;
}> {
  const builtin = listBuiltinTemplates(options.countryCode);
  const supabase = await createClient();
  let query = supabase
    .from("quotation_templates")
    .select(
      "id, name, description, country_code, currency_code, project_type, created_at",
    )
    .eq("business_id", options.businessId)
    .order("updated_at", { ascending: false });

  if (options.countryCode) {
    query = query.eq("country_code", options.countryCode.toUpperCase());
  }

  const { data, error } = await query;

  if (error) {
    // Table may not be migrated yet — still return built-ins.
    return {
      templates: builtin,
      error: null,
    };
  }

  const custom: QuotationTemplateSummary[] = (data ?? []).map((row) => ({
    id: `custom:${row.id}`,
    name: row.name,
    description: row.description ?? "",
    countryCode: row.country_code,
    currencyCode: row.currency_code,
    projectType: row.project_type as QuotationTemplateSummary["projectType"],
    source: "custom" as const,
  }));

  return { templates: [...builtin, ...custom], error: null };
}

export async function getQuotationTemplateById(options: {
  businessId: string;
  templateId: string;
}): Promise<{
  template: QuotationTemplateDefinition | null;
  error: string | null;
}> {
  const builtin = getBuiltinTemplate(options.templateId);
  if (builtin) {
    return { template: builtin, error: null };
  }

  if (!options.templateId.startsWith("custom:")) {
    return { template: null, error: "Template not found." };
  }

  const id = options.templateId.slice("custom:".length);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotation_templates")
    .select("*")
    .eq("business_id", options.businessId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { template: null, error: getQuotationErrorMessage(error) };
  }

  if (!data) {
    return { template: null, error: "Template not found." };
  }

  const template = customRowToDefinition(data);
  if (!template) {
    return { template: null, error: "Saved template data is invalid." };
  }

  return { template, error: null };
}
