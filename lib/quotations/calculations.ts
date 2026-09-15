import {
  formatPaise,
  parseIsoDate,
  parseMoneyToPaise,
  shiftIsoDate,
  todayIsoDate,
} from "@/lib/labour/money";
import {
  calculateLineCostPaise,
  parseQuantityToMilli,
} from "@/lib/materials/stock";
import type {
  CalculatedQuotationItem,
  EstimateVsActual,
  EstimateVsActualLine,
  QuotationActions,
  QuotationCostBreakdown,
  QuotationLineInput,
  QuotationTotals,
} from "@/lib/quotations/types";
import type { DiscountType, QuotationStatus } from "@/types";

const PERCENT_SCALE = 1000;
const PERCENT_BASE = 100 * PERCENT_SCALE;

export function effectiveQuotationStatus(
  status: QuotationStatus,
  validUntil: string | null,
  today = todayIsoDate(),
): QuotationStatus {
  if (status === "sent" && validUntil && validUntil < today) {
    return "expired";
  }

  return status;
}

export function quotationActions(
  status: QuotationStatus,
  hasProject: boolean,
): QuotationActions {
  return {
    edit: status === "draft",
    send: status === "draft",
    accept: status === "sent",
    reject: status === "sent",
    cancel: status === "draft" || status === "sent",
    duplicate: true,
    convert: status === "accepted" && !hasProject,
    viewProject: Boolean(hasProject),
  };
}

export function parsePercentToMilli(
  value: string | number | null | undefined,
): number | null {
  if (value == null || value === "") {
    return null;
  }

  const raw = typeof value === "number" ? trimPercentNumber(value) : value.trim();

  if (!raw || !/^\d+(\.\d{1,3})?$/.test(raw)) {
    return null;
  }

  const [whole, fraction = ""] = raw.split(".");
  const fraction3 = `${fraction}000`.slice(0, 3);
  const milli = Number(whole) * PERCENT_SCALE + Number(fraction3);

  if (!Number.isSafeInteger(milli)) {
    return null;
  }

  return milli;
}

function trimPercentNumber(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return "";
  }

  return value.toFixed(3).replace(/\.?0+$/, "") || "0";
}

export function formatPercentMilli(milli: number): string {
  const absolute = Math.abs(Math.trunc(milli));
  const whole = Math.trunc(absolute / PERCENT_SCALE);
  const fraction = String(absolute % PERCENT_SCALE)
    .padStart(3, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : String(whole);
}

export function percentOfPaise(amountPaise: number, percentMilli: number): number {
  if (amountPaise <= 0 || percentMilli <= 0) {
    return 0;
  }

  return Math.round((amountPaise * percentMilli) / PERCENT_BASE);
}

export function calculateLineTotal(
  quantity: string | number,
  unitPrice: string | number,
): string | null {
  const quantityMilli = parseQuantityToMilli(quantity);
  const unitPricePaise = parseMoneyToPaise(unitPrice);

  if (quantityMilli == null || quantityMilli <= 0 || unitPricePaise == null) {
    return null;
  }

  return formatPaise(calculateLineCostPaise(quantityMilli, unitPricePaise));
}

export function calculateQuotationTotals(input: {
  items: Array<{ total_amount: string }>;
  discount_type: DiscountType | null;
  discount_value: string | number | null | undefined;
  tax_percentage: string | number | null | undefined;
}): QuotationTotals {
  const subtotalPaise = input.items.reduce((sum, item) => {
    return sum + (parseMoneyToPaise(item.total_amount) ?? 0);
  }, 0);

  const discountType = input.discount_type;
  const discountValueRaw =
    input.discount_value == null ? "" : String(input.discount_value).trim();
  const hasDiscount = Boolean(discountType && discountValueRaw);
  const discountValuePaise = hasDiscount
    ? parseMoneyToPaise(discountValueRaw)
    : 0;
  const discountPercentMilli = hasDiscount
    ? parsePercentToMilli(discountValueRaw)
    : 0;

  let discountAmountPaise = 0;

  if (discountType === "percentage") {
    discountAmountPaise = percentOfPaise(
      subtotalPaise,
      discountPercentMilli ?? 0,
    );
  } else if (discountType === "fixed") {
    discountAmountPaise = discountValuePaise ?? 0;
  }

  if (discountAmountPaise > subtotalPaise) {
    discountAmountPaise = subtotalPaise;
  }

  if (discountAmountPaise < 0) {
    discountAmountPaise = 0;
  }

  const afterDiscountPaise = subtotalPaise - discountAmountPaise;
  const taxPercentRaw =
    input.tax_percentage == null ? "" : String(input.tax_percentage).trim();
  const taxPercentMilli = taxPercentRaw
    ? parsePercentToMilli(taxPercentRaw)
    : null;
  const taxAmountPaise = taxPercentMilli
    ? percentOfPaise(afterDiscountPaise, taxPercentMilli)
    : 0;
  const totalPaise = afterDiscountPaise + taxAmountPaise;

  return {
    subtotal: formatPaise(subtotalPaise),
    discount_type: hasDiscount && discountAmountPaise >= 0 ? discountType : null,
    discount_value: hasDiscount ? normalizeMoneyOrPercent(discountValueRaw, discountType) : "0.00",
    discount_amount: formatPaise(discountAmountPaise),
    tax_percentage: taxPercentMilli == null ? null : formatPercentMilli(taxPercentMilli),
    tax_amount: formatPaise(taxAmountPaise),
    total_amount: formatPaise(totalPaise),
  };
}

function normalizeMoneyOrPercent(
  value: string,
  discountType: DiscountType | null,
): string {
  if (discountType === "percentage") {
    const milli = parsePercentToMilli(value);
    return milli == null ? "0.00" : formatPercentMilli(milli);
  }

  const paise = parseMoneyToPaise(value);
  return paise == null ? "0.00" : formatPaise(paise);
}

export function calculateQuotationItems(
  items: QuotationLineInput[],
): CalculatedQuotationItem[] | { error: string } {
  const calculated: CalculatedQuotationItem[] = [];

  for (const [index, item] of items.entries()) {
    const total = calculateLineTotal(item.quantity, item.unit_price);

    if (total == null) {
      return {
        error: `Item ${index + 1} has an invalid quantity or unit price.`,
      };
    }

    calculated.push({
      ...item,
      total_amount: total,
      sort_order: index,
    });
  }

  return calculated;
}

export function buildQuotationCostBreakdown(
  items: Array<{ item_type: string; total_amount: string }>,
): QuotationCostBreakdown {
  let materialsPaise = 0;
  let labourPaise = 0;
  let otherPaise = 0;
  let materialCount = 0;
  let labourCount = 0;
  let otherCount = 0;

  for (const item of items) {
    const paise = parseMoneyToPaise(item.total_amount) ?? 0;

    if (item.item_type === "material") {
      materialsPaise += paise;
      materialCount += 1;
    } else if (item.item_type === "labour") {
      labourPaise += paise;
      labourCount += 1;
    } else {
      otherPaise += paise;
      otherCount += 1;
    }
  }

  return {
    materials: formatPaise(materialsPaise),
    labour: formatPaise(labourPaise),
    other: formatPaise(otherPaise),
    total: formatPaise(materialsPaise + labourPaise + otherPaise),
    material_count: materialCount,
    labour_count: labourCount,
    other_count: otherCount,
  };
}

export function buildEstimateVsActualLine(
  estimated: string,
  actual: string,
): EstimateVsActualLine {
  const estimatedPaise = parseMoneyToPaise(estimated) ?? 0;
  const actualPaise = parseMoneyToPaise(actual) ?? 0;
  const differencePaise = estimatedPaise - actualPaise;
  const variance =
    estimatedPaise <= 0
      ? null
      : Math.round((actualPaise / estimatedPaise) * 1000) / 10;

  return {
    estimated: formatPaise(estimatedPaise),
    actual: formatPaise(actualPaise),
    difference: formatPaise(differencePaise),
    variance_percentage: variance,
    over_estimate: actualPaise > estimatedPaise,
  };
}

export function buildEstimateVsActual(
  estimated: QuotationCostBreakdown,
  actual: {
    labour_cost: string;
    material_cost: string;
    other_expenses: string;
    total_cost: string;
  },
): EstimateVsActual {
  return {
    labour: buildEstimateVsActualLine(estimated.labour, actual.labour_cost),
    materials: buildEstimateVsActualLine(
      estimated.materials,
      actual.material_cost,
    ),
    other: buildEstimateVsActualLine(estimated.other, actual.other_expenses),
    total: buildEstimateVsActualLine(estimated.total, actual.total_cost),
  };
}

export function shiftedValidUntil(
  quotationDate: string,
  validUntil: string | null,
  newQuotationDate: string,
): string | null {
  if (!validUntil) {
    return null;
  }

  const start = parseIsoDate(quotationDate);
  const end = parseIsoDate(validUntil);
  const next = parseIsoDate(newQuotationDate);

  if (!start || !end || !next) {
    return validUntil;
  }

  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);

  if (days < 0) {
    return newQuotationDate;
  }

  return shiftIsoDate(newQuotationDate, days);
}

export function addDaysIso(value: string, days: number): string {
  return shiftIsoDate(value, days);
}

export function varianceLabel(line: EstimateVsActualLine): string {
  if (line.variance_percentage == null) {
    return "No estimate";
  }

  if (line.over_estimate) {
    return "Over estimate";
  }

  return `${formatVariancePercent(line.variance_percentage)} of estimate`;
}

export function formatVariancePercent(value: number): string {
  return `${value % 1 === 0 ? String(value) : value.toFixed(1)}%`;
}
