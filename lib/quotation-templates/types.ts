import type { SupportedCountryCode, SupportedCurrencyCode } from "@/lib/i18n/config";

export const QUOTATION_PROJECT_TYPES = [
  "residential",
  "commercial",
  "villa",
  "apartment",
  "other",
] as const;

export type QuotationProjectType = (typeof QUOTATION_PROJECT_TYPES)[number];

export const QUOTATION_PROJECT_TYPE_LABELS: Record<QuotationProjectType, string> =
  {
    residential: "Residential",
    commercial: "Commercial",
    villa: "Villa",
    apartment: "Apartment",
    other: "Other",
  };

export const QUOTATION_QUALITY_LEVELS = [
  "standard",
  "premium",
  "luxury",
] as const;

export type QuotationQualityLevel = (typeof QUOTATION_QUALITY_LEVELS)[number];

export const QUOTATION_QUALITY_LABELS: Record<QuotationQualityLevel, string> = {
  standard: "Standard",
  premium: "Premium",
  luxury: "Luxury",
};

export const AREA_BASIS_OPTIONS = ["built_up", "plot"] as const;

export type AreaBasis = (typeof AREA_BASIS_OPTIONS)[number];

export const AREA_BASIS_LABELS: Record<AreaBasis, string> = {
  built_up: "Built-up area",
  plot: "Plot area",
};

export const PLOT_AREA_UNITS = ["sqft", "cent", "sqm"] as const;

export type PlotAreaUnit = (typeof PLOT_AREA_UNITS)[number];

export const PLOT_AREA_UNIT_LABELS: Record<PlotAreaUnit, string> = {
  sqft: "sq.ft",
  cent: "cent",
  sqm: "sq.m",
};

/** 1 cent = 435.6 sq.ft (common South India land measure). */
export const SQFT_PER_CENT = 435.6;

/** 1 sq.m ≈ 10.7639 sq.ft */
export const SQFT_PER_SQM = 10.7639;

export const TEMPLATE_LINE_CATEGORIES = [
  "construction",
  "material",
  "labour",
  "other",
  "addon",
] as const;

export type TemplateLineCategory = (typeof TEMPLATE_LINE_CATEGORIES)[number];

export type TemplateFloorRate = {
  floor: number;
  name: string;
  ratePerSqFt: number;
};

export type TemplateQualityConfig = {
  id: QuotationQualityLevel;
  label: string;
  floorRates: TemplateFloorRate[];
};

export type TemplateCostLine = {
  id: string;
  name: string;
  category: TemplateLineCategory;
  unit: string;
  /** Quantity at the template reference area. */
  quantity: number;
  unitPrice: number;
  notes?: string;
};

export type TemplateListItem = {
  id: string;
  text: string;
  included: boolean;
};

export type TemplateAddon = {
  id: string;
  name: string;
  /** Fixed amount, or rate per sq.ft when `ratePerSqFt` is true. */
  amount: number;
  ratePerSqFt?: boolean;
  description?: string;
  selectedByDefault?: boolean;
};

export type QuotationTemplateDefinition = {
  id: string;
  name: string;
  description: string;
  countryCode: SupportedCountryCode | string;
  currencyCode: SupportedCurrencyCode | string;
  projectType: QuotationProjectType;
  /** Built-in templates scale quantities relative to this area. */
  referenceAreaSqFt: number;
  qualityLevels: TemplateQualityConfig[];
  defaultQualityId: QuotationQualityLevel;
  materials: TemplateCostLine[];
  labour: TemplateCostLine[];
  otherCosts: TemplateCostLine[];
  includedItems: TemplateListItem[];
  excludedItems: TemplateListItem[];
  addons: TemplateAddon[];
  defaultTaxPercentage: number;
  defaultContingencyPercentage: number;
  defaultDiscountPercentage: number;
  defaultNotes: string;
  defaultTerms: string;
  source: "builtin" | "custom";
};

export type SavedQuotationTemplatePayload = Omit<
  QuotationTemplateDefinition,
  "id" | "source"
> & {
  source: "custom";
};

export type QuotationTemplateSummary = {
  id: string;
  name: string;
  description: string;
  countryCode: string;
  currencyCode: string;
  projectType: QuotationProjectType;
  source: "builtin" | "custom";
};

export const QUOTATION_TEMPLATE_DISCLAIMER =
  "This quotation uses default estimated rates for calculation purposes. Actual costs may vary based on location, design, material specifications, labour rates, project conditions, taxes, and current market prices. Review and update the rates before issuing the final quotation.";
