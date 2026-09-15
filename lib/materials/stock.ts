import {
  MATERIAL_UNIT_PLURAL_LABELS,
  type StockStatus,
} from "@/constants/material";
import { formatLabourCost } from "@/lib/labour/money";
import type {
  AdjustmentDirection,
  MaterialTransactionType,
  MaterialUnit,
} from "@/types";

const QUANTITY_SCALE = 1000;
const PAISA_PER_RUPEE = 100;

export function parseQuantityToMilli(value: string | number): number | null {
  const raw = typeof value === "number" ? trimQuantityNumber(value) : value.trim();

  if (!raw || !/^\d+(\.\d{1,3})?$/.test(raw)) {
    return null;
  }

  const [whole, fraction = ""] = raw.split(".");
  const fraction3 = `${fraction}000`.slice(0, 3);
  const milli = Number(whole) * QUANTITY_SCALE + Number(fraction3);

  if (!Number.isSafeInteger(milli)) {
    return null;
  }

  return milli;
}

function trimQuantityNumber(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return "";
  }

  return value.toFixed(3).replace(/\.?0+$/, "") || "0";
}

export function formatMilli(milli: number): string {
  const negative = milli < 0;
  const absolute = Math.abs(Math.trunc(milli));
  const whole = Math.trunc(absolute / QUANTITY_SCALE);
  const fraction = String(absolute % QUANTITY_SCALE)
    .padStart(3, "0")
    .replace(/0+$/, "");
  const formatted = fraction ? `${whole}.${fraction}` : String(whole);
  return negative ? `-${formatted}` : formatted;
}

export function parseMoneyToPaise(value: string | number): number | null {
  const raw = typeof value === "number" ? value.toFixed(2) : value.trim();

  if (!raw || !/^\d+(\.\d{1,2})?$/.test(raw)) {
    return null;
  }

  const [whole, fraction = ""] = raw.split(".");
  const fraction2 = `${fraction}00`.slice(0, 2);
  const paise = Number(whole) * PAISA_PER_RUPEE + Number(fraction2);

  if (!Number.isSafeInteger(paise)) {
    return null;
  }

  return paise;
}

export function formatPaise(paise: number): string {
  const negative = paise < 0;
  const absolute = Math.abs(Math.trunc(paise));
  const whole = Math.trunc(absolute / PAISA_PER_RUPEE);
  const fraction = String(absolute % PAISA_PER_RUPEE).padStart(2, "0");
  const formatted = `${whole}.${fraction}`;
  return negative ? `-${formatted}` : formatted;
}

export function calculateLineCostPaise(
  quantityMilli: number,
  unitPricePaise: number,
): number {
  return Math.round((quantityMilli * unitPricePaise) / QUANTITY_SCALE);
}

export function averageUnitPricePaise(
  totalCostPaise: number,
  quantityMilli: number,
): number | null {
  if (quantityMilli <= 0) {
    return null;
  }

  return Math.round((totalCostPaise * QUANTITY_SCALE) / quantityMilli);
}

export function stockValuePaise(
  quantityMilli: number,
  unitPricePaise: number,
): number {
  if (quantityMilli <= 0 || unitPricePaise <= 0) {
    return 0;
  }

  return Math.round((quantityMilli * unitPricePaise) / QUANTITY_SCALE);
}

export function stockDeltaMilli(
  type: MaterialTransactionType,
  quantityMilli: number,
  direction?: AdjustmentDirection | null,
): number {
  if (type === "received" || type === "returned") {
    return quantityMilli;
  }

  if (type === "used") {
    return -quantityMilli;
  }

  if (type === "adjusted" && direction === "increase") {
    return quantityMilli;
  }

  if (type === "adjusted" && direction === "decrease") {
    return -quantityMilli;
  }

  return 0;
}

export function resolveStockStatus(
  currentStockMilli: number,
  minimumStockMilli: number | null,
): StockStatus {
  if (currentStockMilli <= 0) {
    return "out_of_stock";
  }

  if (minimumStockMilli !== null && currentStockMilli <= minimumStockMilli) {
    return "low_stock";
  }

  return "in_stock";
}

const SINGULAR_UNIT_LABELS: Record<MaterialUnit, string> = {
  bag: "bag",
  kg: "kg",
  ton: "ton",
  cubic_ft: "cu ft",
  cubic_m: "cu m",
  piece: "pc",
  box: "box",
  liter: "L",
  meter: "m",
  sq_ft: "sq ft",
  sq_m: "sq m",
  other: "unit",
};

export function formatQuantityWithUnit(
  quantity: string | number,
  unit: MaterialUnit,
): string {
  const milli = parseQuantityToMilli(quantity);
  const formatted = milli === null ? String(quantity) : formatMilli(milli);
  const label =
    milli === QUANTITY_SCALE
      ? SINGULAR_UNIT_LABELS[unit]
      : MATERIAL_UNIT_PLURAL_LABELS[unit];

  return `${formatted} ${label}`;
}

export function insufficientStockMessage(
  availableMilli: number,
  unit: MaterialUnit,
): string {
  return `Insufficient stock. Available quantity: ${formatQuantityWithUnit(formatMilli(availableMilli), unit)}.`;
}

export const formatMaterialCost = formatLabourCost;
