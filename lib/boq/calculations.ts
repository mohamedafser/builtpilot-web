import {
  isBoqCompletionStatus,
  type BoqCompletionStatus,
} from "@/constants/boq";
import { formatPaise, parseMoneyToPaise } from "@/lib/labour/money";
import {
  calculateLineCostPaise,
  formatMilli,
  parseQuantityToMilli,
} from "@/lib/materials/stock";
import type {
  BoqActions,
  BoqItemInput,
  BoqItemProgress,
  BoqSummary,
  CalculatedBoqItem,
} from "@/lib/boq/types";
import type { BoqStatus } from "@/types";

export function calculateEstimatedAmount(
  quantity: string | number,
  rate: string | number,
): string | null {
  const quantityMilli = parseQuantityToMilli(quantity);
  const ratePaise = parseMoneyToPaise(rate);

  if (quantityMilli == null || quantityMilli <= 0 || ratePaise == null) {
    return null;
  }

  return formatPaise(calculateLineCostPaise(quantityMilli, ratePaise));
}

export function calculateCompletedValue(
  completedQuantity: string | number,
  rate: string | number,
): string {
  const quantityMilli = parseQuantityToMilli(completedQuantity) ?? 0;
  const ratePaise = parseMoneyToPaise(rate) ?? 0;

  if (quantityMilli <= 0 || ratePaise <= 0) {
    return "0.00";
  }

  return formatPaise(calculateLineCostPaise(quantityMilli, ratePaise));
}

export function remainingQuantity(
  estimatedQuantity: string | number,
  completedQuantity: string | number,
): string {
  const estimatedMilli = parseQuantityToMilli(estimatedQuantity) ?? 0;
  const completedMilli = parseQuantityToMilli(completedQuantity) ?? 0;
  const remainingMilli = Math.max(0, estimatedMilli - completedMilli);
  return formatMilli(remainingMilli);
}

export function remainingValue(
  estimatedQuantity: string | number,
  completedQuantity: string | number,
  rate: string | number,
): string {
  return calculateCompletedValue(
    remainingQuantity(estimatedQuantity, completedQuantity),
    rate,
  );
}

export function completionPercentage(
  completedValue: string | number,
  estimatedValue: string | number,
): number | null {
  const estimatedPaise = parseMoneyToPaise(estimatedValue) ?? 0;

  if (estimatedPaise <= 0) {
    return null;
  }

  const completedPaise = parseMoneyToPaise(completedValue) ?? 0;
  return Math.round((completedPaise / estimatedPaise) * 1000) / 10;
}

export function itemCompletionStatus(
  estimatedQuantity: string | number,
  completedQuantity: string | number,
): BoqCompletionStatus {
  const estimatedMilli = parseQuantityToMilli(estimatedQuantity) ?? 0;
  const completedMilli = parseQuantityToMilli(completedQuantity) ?? 0;

  if (completedMilli <= 0) {
    return "not_started";
  }

  if (completedMilli >= estimatedMilli && estimatedMilli > 0) {
    return "completed";
  }

  return "in_progress";
}

export function wouldExceedRemaining(
  estimatedQuantity: string | number,
  completedQuantity: string | number,
  newQuantity: string | number,
):
  { exceeds: true; remaining: string } | { exceeds: false; remaining: string } {
  const estimatedMilli = parseQuantityToMilli(estimatedQuantity);
  const completedMilli = parseQuantityToMilli(completedQuantity) ?? 0;
  const newMilli = parseQuantityToMilli(newQuantity);
  const remainingMilli = Math.max(0, (estimatedMilli ?? 0) - completedMilli);

  if (estimatedMilli == null || newMilli == null) {
    return { exceeds: true, remaining: formatMilli(remainingMilli) };
  }

  if (completedMilli + newMilli > estimatedMilli) {
    return { exceeds: true, remaining: formatMilli(remainingMilli) };
  }

  return { exceeds: false, remaining: formatMilli(remainingMilli) };
}

export function measurementExceedsMessage(remaining: string): string {
  return `Measurement exceeds remaining quantity. Remaining quantity: ${remaining}.`;
}

export function buildItemProgress<
  T extends {
    estimated_quantity: string;
    completed_quantity: string;
    rate: string;
    estimated_amount: string;
  },
>(
  item: T,
): T & {
  remaining_quantity: string;
  completed_value: string;
  remaining_value: string;
  completion_percentage: number | null;
  completion_status: BoqCompletionStatus;
} {
  const completedValue = calculateCompletedValue(
    item.completed_quantity,
    item.rate,
  );
  const remainingQty = remainingQuantity(
    item.estimated_quantity,
    item.completed_quantity,
  );
  const remainingVal = calculateCompletedValue(remainingQty, item.rate);

  return {
    ...item,
    remaining_quantity: remainingQty,
    completed_value: completedValue,
    remaining_value: remainingVal,
    completion_percentage: completionPercentage(
      completedValue,
      item.estimated_amount,
    ),
    completion_status: itemCompletionStatus(
      item.estimated_quantity,
      item.completed_quantity,
    ),
  };
}

export function buildBoqSummary(
  items: Array<{
    estimated_quantity: string;
    estimated_amount: string;
    completed_quantity: string;
    rate: string;
  }>,
): BoqSummary {
  let estimatedQuantityMilli = 0;
  let estimatedPaise = 0;
  let completedPaise = 0;

  for (const item of items) {
    estimatedQuantityMilli +=
      parseQuantityToMilli(item.estimated_quantity) ?? 0;
    estimatedPaise += parseMoneyToPaise(item.estimated_amount) ?? 0;
    completedPaise +=
      parseMoneyToPaise(
        calculateCompletedValue(item.completed_quantity, item.rate),
      ) ?? 0;
  }

  const remainingPaise = Math.max(0, estimatedPaise - completedPaise);

  return {
    item_count: items.length,
    estimated_quantity: formatMilli(estimatedQuantityMilli),
    estimated_value: formatPaise(estimatedPaise),
    completed_value: formatPaise(completedPaise),
    remaining_value: formatPaise(remainingPaise),
    completion_percentage: completionPercentage(
      formatPaise(completedPaise),
      formatPaise(estimatedPaise),
    ),
  };
}

export function generateBoqItemCode(
  sectionName: string,
  existingCodes: string[] = [],
): string {
  const normalized = sectionName
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const abbreviationMap: Record<string, string> = {
    "site work": "SW",
    sitework: "SW",
    foundation: "FD",
    substructure: "SS",
    superstructure: "SP",
    masonry: "MS",
    plumbing: "PL",
    "plumbing and drainage": "PL",
    electrical: "EL",
    finishing: "FS",
    roofing: "RF",
    general: "GE",
    civil: "CV",
    structural: "ST",
    carpentry: "CP",
    "doors and windows": "DW",
    painting: "PT",
    flooring: "FL",
  };

  const alias = normalized.replace(/\s+/g, " ");
  const prefix =
    abbreviationMap[alias] ??
    (() => {
      const words = alias
        .split(" ")
        .filter((word) => !["and", "of", "the", "for"].includes(word));

      if (words.length === 0) {
        return "GE";
      }

      if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
      }

      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    })();

  const numbers = existingCodes
    .map((code) => {
      const match = code.trim().match(/^(?:[A-Z]{2,3})-(\d+)$/i);
      return match ? Number.parseInt(match[1], 10) : 0;
    })
    .filter((value) => Number.isFinite(value));

  const next = Math.max(0, ...numbers) + 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

export function calculateBoqItem(
  item: BoqItemInput,
  sortOrder: number,
  sectionName?: string,
  existingCodes: string[] = [],
): CalculatedBoqItem | { error: string } {
  const estimatedAmount = calculateEstimatedAmount(
    item.estimated_quantity,
    item.rate,
  );

  if (estimatedAmount == null) {
    return { error: "Item has an invalid quantity or rate." };
  }

  const nextCode =
    item.item_code && item.item_code.trim().length > 0
      ? item.item_code.trim()
      : sectionName
        ? generateBoqItemCode(sectionName, existingCodes)
        : (item.item_code?.trim() ?? null);

  return {
    ...item,
    item_code: nextCode,
    estimated_amount: estimatedAmount,
    sort_order: sortOrder,
  };
}

export function boqActions(status: BoqStatus): BoqActions {
  return {
    edit: status === "draft" || status === "active",
    activate: status === "draft",
    complete: status === "active",
    archive: status !== "archived",
    duplicate: true,
    measure: status === "draft" || status === "active",
  };
}

export function formatCompletionPercent(value: number | null): string {
  if (value == null) {
    return "—";
  }

  return `${value % 1 === 0 ? String(value) : value.toFixed(1)}%`;
}

export function matchesItemFilters(
  item: BoqItemProgress,
  filters: {
    query?: string;
    sectionId?: string;
    itemType?: string;
    completion?: string;
  },
): boolean {
  if (filters.sectionId && (item.section_id ?? "") !== filters.sectionId) {
    return false;
  }

  if (
    filters.itemType &&
    filters.itemType !== "all" &&
    item.item_type !== filters.itemType
  ) {
    return false;
  }

  if (
    filters.completion &&
    isBoqCompletionStatus(filters.completion) &&
    item.completion_status !== filters.completion
  ) {
    return false;
  }

  const query = filters.query?.trim().toLowerCase();

  if (!query) {
    return true;
  }

  return [item.item_code, item.description, item.section_name]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(query));
}

export function differenceAmount(
  estimated: string | number,
  actual: string | number,
): string {
  const estimatedPaise = parseMoneyToPaise(estimated) ?? 0;
  const actualPaise = parseMoneyToPaise(actual) ?? 0;
  return formatPaise(estimatedPaise - actualPaise);
}
