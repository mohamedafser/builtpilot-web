import { indiaResidentialStandard } from "@/lib/quotation-templates/defaults/india-residential-standard";
import { uaeResidentialStandard } from "@/lib/quotation-templates/defaults/uae-residential-standard";
import type {
  QuotationTemplateDefinition,
  QuotationTemplateSummary,
} from "@/lib/quotation-templates/types";

const BUILTIN_TEMPLATES: QuotationTemplateDefinition[] = [
  indiaResidentialStandard,
  uaeResidentialStandard,
];

export function listBuiltinTemplates(
  countryCode?: string | null,
): QuotationTemplateSummary[] {
  const country = countryCode?.trim().toUpperCase();

  return BUILTIN_TEMPLATES.filter((template) =>
    country ? template.countryCode === country : true,
  ).map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    countryCode: template.countryCode,
    currencyCode: template.currencyCode,
    projectType: template.projectType,
    source: "builtin" as const,
  }));
}

export function getBuiltinTemplate(
  id: string,
): QuotationTemplateDefinition | null {
  return BUILTIN_TEMPLATES.find((template) => template.id === id) ?? null;
}

export function cloneTemplateDefinition(
  template: QuotationTemplateDefinition,
): QuotationTemplateDefinition {
  return structuredClone(template);
}

export function listBuiltinCountries(): Array<{
  code: string;
  currencyCode: string;
}> {
  const map = new Map<string, string>();
  for (const template of BUILTIN_TEMPLATES) {
    map.set(template.countryCode, template.currencyCode);
  }

  return [...map.entries()].map(([code, currencyCode]) => ({
    code,
    currencyCode,
  }));
}
