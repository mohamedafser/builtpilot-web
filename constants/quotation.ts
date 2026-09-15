import type {
  DiscountType,
  Quotation,
  QuotationItem,
  QuotationItemType,
  QuotationStatus,
} from "@/types";

export const QUOTATION_STATUSES: readonly QuotationStatus[] = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
  "cancelled",
] as const;

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
  cancelled: "Cancelled",
};

export function isQuotationStatus(value: string): value is QuotationStatus {
  return (QUOTATION_STATUSES as readonly string[]).includes(value);
}

export const QUOTATION_ITEM_TYPES: readonly QuotationItemType[] = [
  "material",
  "labour",
  "custom",
] as const;

export const QUOTATION_ITEM_TYPE_LABELS: Record<QuotationItemType, string> = {
  material: "Material",
  labour: "Labour",
  custom: "Custom",
};

export function isQuotationItemType(value: string): value is QuotationItemType {
  return (QUOTATION_ITEM_TYPES as readonly string[]).includes(value);
}

export const DISCOUNT_TYPES: readonly DiscountType[] = [
  "percentage",
  "fixed",
] as const;

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  percentage: "Percentage",
  fixed: "Fixed amount",
};

export function isDiscountType(value: string): value is DiscountType {
  return (DISCOUNT_TYPES as readonly string[]).includes(value);
}

export const QUOTATION_DATE_PRESETS = [
  "all",
  "today",
  "this_week",
  "this_month",
  "last_month",
  "custom",
] as const;

export type QuotationDatePreset = (typeof QUOTATION_DATE_PRESETS)[number];

export const QUOTATION_DATE_PRESET_LABELS: Record<QuotationDatePreset, string> =
  {
    all: "All dates",
    today: "Today",
    this_week: "This week",
    this_month: "This month",
    last_month: "Last month",
    custom: "Custom range",
  };

export function isQuotationDatePreset(
  value: string,
): value is QuotationDatePreset {
  return (QUOTATION_DATE_PRESETS as readonly string[]).includes(value);
}

export const QUOTATION_UNITS = [
  "bag",
  "kg",
  "ton",
  "cubic_ft",
  "cubic_m",
  "piece",
  "box",
  "liter",
  "meter",
  "sq_ft",
  "sq_m",
  "day",
  "hour",
  "lot",
  "job",
  "trip",
  "load",
] as const;

export const QUOTATION_UNIT_LABELS: Record<
  (typeof QUOTATION_UNITS)[number],
  string
> = {
  bag: "Bag",
  kg: "Kilogram",
  ton: "Ton",
  cubic_ft: "Cubic ft",
  cubic_m: "Cubic m",
  piece: "Piece",
  box: "Box",
  liter: "Liter",
  meter: "Meter",
  sq_ft: "Sq ft",
  sq_m: "Sq m",
  day: "Day",
  hour: "Hour",
  lot: "Lot",
  job: "Job",
  trip: "Trip",
  load: "Load",
};

export const DEFAULT_QUOTATION_VALIDITY_DAYS = 30;

export function defaultUnitForItemType(itemType: QuotationItemType): string {
  if (itemType === "labour") {
    return "day";
  }

  if (itemType === "material") {
    return "bag";
  }

  return "lot";
}

function formDecimalString(value: string | number | null | undefined): string {
  if (value == null || value === "") {
    return "";
  }

  return String(value).trim();
}

/** Empty when missing or zero — keeps optional money/percent fields valid. */
function formOptionalAmountString(
  value: string | number | null | undefined,
): string {
  const raw = formDecimalString(value);
  if (!raw) {
    return "";
  }

  const parsed = Number(raw);
  if (Number.isFinite(parsed) && parsed === 0) {
    return "";
  }

  return raw;
}

export function quotationToFormValues(
  quotation: Quotation,
  items: QuotationItem[],
) {
  return {
    title: quotation.title,
    client_name: quotation.client_name,
    client_phone: quotation.client_phone ?? "",
    client_email: quotation.client_email ?? "",
    client_address: quotation.client_address ?? "",
    quotation_date: quotation.quotation_date,
    valid_until: quotation.valid_until ?? "",
    project_id: quotation.project_id ?? "",
    discount_type: quotation.discount_type ?? "",
    discount_value: formOptionalAmountString(quotation.discount_value),
    tax_percentage: formOptionalAmountString(quotation.tax_percentage),
    notes: quotation.notes ?? "",
    terms: quotation.terms ?? "",
    submit_action: "draft" as const,
    items: items
      .slice()
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((item) => ({
        item_type: item.item_type,
        material_id: item.material_id ?? "",
        worker_id: item.worker_id ?? "",
        description: item.description,
        quantity: formDecimalString(item.quantity),
        unit: item.unit,
        unit_price: formDecimalString(item.unit_price),
        notes: item.notes ?? "",
      })),
  };
}
