import { z } from "zod";
import {
  AREA_BASIS_OPTIONS,
  PLOT_AREA_UNITS,
  QUOTATION_PROJECT_TYPES,
  QUOTATION_QUALITY_LEVELS,
  TEMPLATE_LINE_CATEGORIES,
} from "@/lib/quotation-templates/types";

const nonNegativeNumber = z.number().finite().min(0, "Must be 0 or greater.");

const floorRateSchema = z.object({
  floor: z.number().int().min(0).max(30),
  name: z.string().trim().min(1).max(80),
  ratePerSqFt: nonNegativeNumber,
});

const costLineSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  category: z.enum(TEMPLATE_LINE_CATEGORIES),
  unit: z.string().trim().min(1).max(40),
  quantity: nonNegativeNumber,
  unitPrice: nonNegativeNumber,
  notes: z.string().trim().max(500).optional(),
});

const listItemSchema = z.object({
  id: z.string().trim().min(1).max(80),
  text: z.string().trim().min(1).max(200),
  included: z.boolean(),
});

const addonSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  amount: nonNegativeNumber,
  ratePerSqFt: z.boolean().optional(),
  description: z.string().trim().max(300).optional(),
  selectedByDefault: z.boolean().optional(),
});

const qualitySchema = z.object({
  id: z.enum(QUOTATION_QUALITY_LEVELS),
  label: z.string().trim().min(1).max(40),
  floorRates: z.array(floorRateSchema).min(1).max(20),
});

export const quotationTemplatePayloadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500),
  countryCode: z.string().trim().min(2).max(8),
  currencyCode: z.string().trim().min(3).max(8),
  projectType: z.enum(QUOTATION_PROJECT_TYPES),
  referenceAreaSqFt: z.number().finite().positive(),
  qualityLevels: z.array(qualitySchema).min(1).max(5),
  defaultQualityId: z.enum(QUOTATION_QUALITY_LEVELS),
  materials: z.array(costLineSchema).max(100),
  labour: z.array(costLineSchema).max(100),
  otherCosts: z.array(costLineSchema).max(100),
  includedItems: z.array(listItemSchema).max(100),
  excludedItems: z.array(listItemSchema).max(100),
  addons: z.array(addonSchema).max(50),
  defaultTaxPercentage: nonNegativeNumber.max(100),
  defaultContingencyPercentage: nonNegativeNumber.max(100),
  defaultDiscountPercentage: nonNegativeNumber.max(100),
  defaultNotes: z.string().trim().max(5000),
  defaultTerms: z.string().trim().max(8000),
  source: z.literal("custom"),
});

export const saveQuotationTemplateSchema = z.object({
  name: z.string().trim().min(2, "Enter a template name.").max(120),
  payload: quotationTemplatePayloadSchema,
});

export const estimateDraftSchema = z.object({
  templateId: z.string().trim().min(1),
  qualityId: z.enum(QUOTATION_QUALITY_LEVELS),
  areaBasis: z.enum(AREA_BASIS_OPTIONS),
  plotAreaValue: nonNegativeNumber,
  plotAreaUnit: z.enum(PLOT_AREA_UNITS),
  sharedBuiltUpSqFt: nonNegativeNumber,
  floorCount: z.number().int().min(1).max(20),
  pricingMode: z.enum(["turnkey", "itemized"]),
  taxPercentage: nonNegativeNumber.max(100),
  contingencyPercentage: nonNegativeNumber.max(100),
  discountPercentage: nonNegativeNumber.max(100),
});

export type SaveQuotationTemplateInput = z.infer<
  typeof saveQuotationTemplateSchema
>;
