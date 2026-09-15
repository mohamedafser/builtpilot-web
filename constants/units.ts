import type { BoqUnit } from "@/types";

export const CONSTRUCTION_UNITS: readonly BoqUnit[] = [
  "sq_ft",
  "sq_m",
  "cubic_ft",
  "cubic_m",
  "meter",
  "kg",
  "ton",
  "bag",
  "piece",
  "day",
  "hour",
  "liter",
  "lot",
  "other",
] as const;

export const CONSTRUCTION_UNIT_LABELS: Record<BoqUnit, string> = {
  sq_ft: "Sq ft",
  sq_m: "Sq m",
  cubic_ft: "Cubic ft",
  cubic_m: "Cubic m",
  meter: "Meter",
  kg: "Kilogram",
  ton: "Ton",
  bag: "Bag",
  piece: "Piece",
  day: "Day",
  hour: "Hour",
  liter: "Liter",
  lot: "Lot",
  other: "Other",
};

export const CONSTRUCTION_UNIT_SHORT_LABELS: Record<BoqUnit, string> = {
  sq_ft: "sq ft",
  sq_m: "sq m",
  cubic_ft: "cu ft",
  cubic_m: "cu m",
  meter: "m",
  kg: "kg",
  ton: "ton",
  bag: "bag",
  piece: "pc",
  day: "day",
  hour: "hr",
  liter: "L",
  lot: "lot",
  other: "unit",
};

export function isConstructionUnit(value: string): value is BoqUnit {
  return (CONSTRUCTION_UNITS as readonly string[]).includes(value);
}
