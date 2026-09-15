import type { EstimateResult } from "@/lib/quotation-templates/calculations";
import type { QuotationTemplateDefinition } from "@/lib/quotation-templates/types";
import { QUOTATION_TEMPLATE_DISCLAIMER } from "@/lib/quotation-templates/types";
import type { QuotationFormValues } from "@/lib/validations/quotation";
import { todayIsoDate } from "@/lib/labour/money";
import { DEFAULT_QUOTATION_VALIDITY_DAYS } from "@/constants/quotation";

function moneyString(value: number): string {
  return value.toFixed(2);
}

function quantityString(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return String(Math.round(value * 1000) / 1000);
}

function shiftDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function estimateToQuotationFormValuesWithDiscount({
  template,
  estimate,
  title,
  clientName,
  clientPhone,
  clientEmail,
  clientAddress,
  quotationDate,
  validUntil,
  notes: notesOverride,
  terms: termsOverride,
  projectId,
  discountPercentage,
  pricingMode,
}: {
  template: QuotationTemplateDefinition;
  estimate: EstimateResult;
  title?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  quotationDate?: string;
  validUntil?: string;
  notes?: string;
  terms?: string;
  projectId?: string;
  discountPercentage: number;
  pricingMode: "turnkey" | "itemized";
}): QuotationFormValues {
  const today = todayIsoDate();
  const items: QuotationFormValues["items"] = [];

  for (const floor of estimate.floorCosts) {
    if (floor.amount <= 0) continue;
    items.push({
      item_type: "custom",
      material_id: "",
      worker_id: "",
      description: `${floor.name} construction (${floor.areaSqFt} sq.ft × ${floor.ratePerSqFt}/sq.ft)`,
      quantity: "1",
      unit: "lot",
      unit_price: moneyString(floor.amount),
      notes: "",
    });
  }

  if (pricingMode === "itemized") {
    for (const line of estimate.materials) {
      if (line.amount <= 0) continue;
      items.push({
        item_type: "custom",
        material_id: "",
        worker_id: "",
        description: `Material · ${line.name}`,
        quantity: quantityString(line.quantity),
        unit: line.unit,
        unit_price: moneyString(line.unitPrice),
        notes: "",
      });
    }

    for (const line of estimate.labour) {
      if (line.amount <= 0) continue;
      items.push({
        item_type: "custom",
        material_id: "",
        worker_id: "",
        description: `Labour · ${line.name}`,
        quantity: quantityString(line.quantity),
        unit: line.unit,
        unit_price: moneyString(line.unitPrice),
        notes: "",
      });
    }

    for (const line of estimate.other) {
      if (line.amount <= 0) continue;
      items.push({
        item_type: "custom",
        material_id: "",
        worker_id: "",
        description: `Other · ${line.name}`,
        quantity: quantityString(line.quantity),
        unit: line.unit,
        unit_price: moneyString(line.unitPrice),
        notes: "",
      });
    }
  }

  for (const addon of estimate.selectedAddons) {
    if (addon.amount <= 0) continue;
    items.push({
      item_type: "custom",
      material_id: "",
      worker_id: "",
      description: `Add-on · ${addon.name}`,
      quantity: "1",
      unit: "lot",
      unit_price: moneyString(addon.amount),
      notes: "",
    });
  }

  if (estimate.contingencyAmount > 0) {
    items.push({
      item_type: "custom",
      material_id: "",
      worker_id: "",
      description: "Contingency",
      quantity: "1",
      unit: "lot",
      unit_price: moneyString(estimate.contingencyAmount),
      notes: "",
    });
  }

  if (items.length === 0) {
    items.push({
      item_type: "custom",
      material_id: "",
      worker_id: "",
      description: "Construction estimate",
      quantity: "1",
      unit: "lot",
      unit_price: moneyString(estimate.grandTotal),
      notes: "",
    });
  }

  const included = estimate.includedItems
    .map((item) => `• ${item.text}`)
    .join("\n");
  const excluded = estimate.excludedItems
    .map((item) => `• ${item.text}`)
    .join("\n");

  const materialSummary =
    pricingMode === "turnkey" && estimate.materialCost > 0
      ? `\nIndicative materials (included in package rate): ${estimate.materialCost.toFixed(2)}`
      : "";
  const labourSummary =
    pricingMode === "turnkey" && estimate.labourCost > 0
      ? `\nIndicative labour (included in package rate): ${estimate.labourCost.toFixed(2)}`
      : "";

  const generatedNotes = [
    notesOverride?.trim() || template.defaultNotes,
    "",
    QUOTATION_TEMPLATE_DISCLAIMER,
    estimate.isEstimateOnly
      ? "\nThis amount was calculated using plot area and should be treated as an estimated quotation until built-up areas are confirmed."
      : "",
    materialSummary,
    labourSummary,
    included ? `\nIncluded:\n${included}` : "",
    excluded ? `\nNot included:\n${excluded}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    title: title?.trim() || `${template.name} estimate`,
    client_name: clientName?.trim() || "Client",
    client_phone: clientPhone?.trim() || "",
    client_email: clientEmail?.trim() || "",
    client_address: clientAddress?.trim() || "",
    project_id: projectId ?? "",
    quotation_date: quotationDate?.trim() || today,
    valid_until:
      validUntil?.trim() || shiftDays(today, DEFAULT_QUOTATION_VALIDITY_DAYS),
    discount_type: discountPercentage > 0 ? "percentage" : "",
    discount_value: discountPercentage > 0 ? String(discountPercentage) : "",
    tax_percentage:
      estimate.taxPercentage > 0 ? String(estimate.taxPercentage) : "",
    notes: generatedNotes,
    terms: termsOverride?.trim() || template.defaultTerms,
    items,
    submit_action: "draft",
  };
}

export function estimateToQuotationFormValues(
  args: Omit<
    Parameters<typeof estimateToQuotationFormValuesWithDiscount>[0],
    "discountPercentage" | "pricingMode"
  > & {
    discountPercentage?: number;
    pricingMode?: "turnkey" | "itemized";
  },
): QuotationFormValues {
  return estimateToQuotationFormValuesWithDiscount({
    ...args,
    discountPercentage: args.discountPercentage ?? 0,
    pricingMode: args.pricingMode ?? "turnkey",
  });
}
