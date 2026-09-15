import { currencyForCountry } from "@/lib/i18n/config";
import type { QuotationTemplateDefinition } from "@/lib/quotation-templates/types";

/** Empty starter with the same field structure as country templates. */
export function createBlankTemplate(
  countryCode = "IN",
): QuotationTemplateDefinition {
  const code = countryCode.toUpperCase();
  const currencyCode = currencyForCountry(code);

  return {
    id: `blank:${code.toLowerCase()}`,
    name: "Blank quotation",
    description:
      "Start from empty rates and line items. Same fields as a default template.",
    countryCode: code,
    currencyCode,
    projectType: "residential",
    referenceAreaSqFt: 1000,
    defaultQualityId: "standard",
    qualityLevels: [
      {
        id: "standard",
        label: "Standard",
        floorRates: [
          { floor: 0, name: "Ground Floor", ratePerSqFt: 0 },
          { floor: 1, name: "First Floor", ratePerSqFt: 0 },
          { floor: 2, name: "Second Floor", ratePerSqFt: 0 },
          { floor: 3, name: "Third Floor", ratePerSqFt: 0 },
        ],
      },
      {
        id: "premium",
        label: "Premium",
        floorRates: [
          { floor: 0, name: "Ground Floor", ratePerSqFt: 0 },
          { floor: 1, name: "First Floor", ratePerSqFt: 0 },
          { floor: 2, name: "Second Floor", ratePerSqFt: 0 },
          { floor: 3, name: "Third Floor", ratePerSqFt: 0 },
        ],
      },
      {
        id: "luxury",
        label: "Luxury",
        floorRates: [
          { floor: 0, name: "Ground Floor", ratePerSqFt: 0 },
          { floor: 1, name: "First Floor", ratePerSqFt: 0 },
          { floor: 2, name: "Second Floor", ratePerSqFt: 0 },
          { floor: 3, name: "Third Floor", ratePerSqFt: 0 },
        ],
      },
    ],
    materials: [],
    labour: [],
    otherCosts: [],
    includedItems: [],
    excludedItems: [],
    addons: [],
    defaultTaxPercentage: code === "AE" ? 5 : 18,
    defaultContingencyPercentage: 0,
    defaultDiscountPercentage: 0,
    defaultNotes: "",
    defaultTerms: "",
    source: "builtin",
  };
}
