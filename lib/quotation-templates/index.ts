import {
  buildFloorRatesForCount,
  calculateTemplateQuotation,
  getDefaultFloorRates,
} from "@/lib/quotation-templates/calculations";
import {
  cloneTemplateDefinition,
  getBuiltinTemplate,
  listBuiltinCountries,
  listBuiltinTemplates,
} from "@/lib/quotation-templates/defaults/catalog";
import { createBlankTemplate } from "@/lib/quotation-templates/defaults/blank";
import { definitionToSavePayload } from "@/lib/quotation-templates/save-payload";
import {
  estimateToQuotationFormValues,
  estimateToQuotationFormValuesWithDiscount,
} from "@/lib/quotation-templates/to-quotation";
import {
  AREA_BASIS_LABELS,
  AREA_BASIS_OPTIONS,
  PLOT_AREA_UNIT_LABELS,
  PLOT_AREA_UNITS,
  QUOTATION_PROJECT_TYPE_LABELS,
  QUOTATION_QUALITY_LABELS,
  QUOTATION_QUALITY_LEVELS,
  QUOTATION_TEMPLATE_DISCLAIMER,
  SQFT_PER_CENT,
} from "@/lib/quotation-templates/types";
import { fromSqFt, toSqFt } from "@/lib/quotation-templates/units";

export type {
  AreaBasis,
  PlotAreaUnit,
  QuotationProjectType,
  QuotationQualityLevel,
  QuotationTemplateDefinition,
  QuotationTemplateSummary,
  TemplateAddon,
  TemplateCostLine,
  TemplateFloorRate,
  TemplateListItem,
} from "@/lib/quotation-templates/types";

export type {
  EstimateInput,
  EstimateResult,
  FloorAreaInput,
  FloorCostBreakdown,
  LineCostBreakdown,
} from "@/lib/quotation-templates/calculations";

/** Client-safe exports only. Server queries/mutations live in their own modules. */
export {
  AREA_BASIS_LABELS,
  AREA_BASIS_OPTIONS,
  PLOT_AREA_UNIT_LABELS,
  PLOT_AREA_UNITS,
  QUOTATION_PROJECT_TYPE_LABELS,
  QUOTATION_QUALITY_LABELS,
  QUOTATION_QUALITY_LEVELS,
  QUOTATION_TEMPLATE_DISCLAIMER,
  SQFT_PER_CENT,
  buildFloorRatesForCount,
  calculateTemplateQuotation,
  cloneTemplateDefinition,
  createBlankTemplate,
  definitionToSavePayload,
  estimateToQuotationFormValues,
  estimateToQuotationFormValuesWithDiscount,
  fromSqFt,
  getBuiltinTemplate,
  getDefaultFloorRates,
  listBuiltinCountries,
  listBuiltinTemplates,
  toSqFt,
};
