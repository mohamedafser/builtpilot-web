import type { QuotationTemplateDefinition } from "@/lib/quotation-templates/types";
import type { SaveQuotationTemplateInput } from "@/lib/validations/quotation-template";

/** Pure helper — safe for client components. */
export function definitionToSavePayload(
  template: QuotationTemplateDefinition,
  name: string,
): SaveQuotationTemplateInput {
  return {
    name,
    payload: {
      name,
      description: template.description,
      countryCode: template.countryCode,
      currencyCode: template.currencyCode,
      projectType: template.projectType,
      referenceAreaSqFt: template.referenceAreaSqFt,
      qualityLevels: template.qualityLevels,
      defaultQualityId: template.defaultQualityId,
      materials: template.materials,
      labour: template.labour,
      otherCosts: template.otherCosts,
      includedItems: template.includedItems,
      excludedItems: template.excludedItems,
      addons: template.addons,
      defaultTaxPercentage: template.defaultTaxPercentage,
      defaultContingencyPercentage: template.defaultContingencyPercentage,
      defaultDiscountPercentage: template.defaultDiscountPercentage,
      defaultNotes: template.defaultNotes,
      defaultTerms: template.defaultTerms,
      source: "custom",
    },
  };
}
