import {
  SQFT_PER_CENT,
  SQFT_PER_SQM,
  type PlotAreaUnit,
} from "@/lib/quotation-templates/types";

export function toSqFt(value: number, unit: PlotAreaUnit): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  if (unit === "cent") {
    return value * SQFT_PER_CENT;
  }

  if (unit === "sqm") {
    return value * SQFT_PER_SQM;
  }

  return value;
}

export function fromSqFt(sqFt: number, unit: PlotAreaUnit): number {
  if (!Number.isFinite(sqFt) || sqFt < 0) {
    return 0;
  }

  if (unit === "cent") {
    return sqFt / SQFT_PER_CENT;
  }

  if (unit === "sqm") {
    return sqFt / SQFT_PER_SQM;
  }

  return sqFt;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function roundArea(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}
