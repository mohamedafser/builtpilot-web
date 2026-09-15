import type {
  AdjustmentDirection,
  Material,
  MaterialCategory,
  MaterialStatus,
  MaterialTransactionType,
  MaterialUnit,
} from "@/types";

export const MATERIAL_CATEGORIES: readonly MaterialCategory[] = [
  "cement",
  "sand",
  "aggregate",
  "steel",
  "bricks",
  "blocks",
  "plumbing",
  "electrical",
  "tiles",
  "paint",
  "wood",
  "hardware",
  "other",
] as const;

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  cement: "Cement",
  sand: "Sand",
  aggregate: "Aggregate",
  steel: "Steel",
  bricks: "Bricks",
  blocks: "Blocks",
  plumbing: "Plumbing",
  electrical: "Electrical",
  tiles: "Tiles",
  paint: "Paint",
  wood: "Wood",
  hardware: "Hardware",
  other: "Other",
};

export function isMaterialCategory(value: string): value is MaterialCategory {
  return (MATERIAL_CATEGORIES as readonly string[]).includes(value);
}

export const MATERIAL_UNITS: readonly MaterialUnit[] = [
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
  "other",
] as const;

export const MATERIAL_UNIT_LABELS: Record<MaterialUnit, string> = {
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
  other: "Other",
};

export const MATERIAL_UNIT_SHORT_LABELS: Record<MaterialUnit, string> = {
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

export const MATERIAL_UNIT_PLURAL_LABELS: Record<MaterialUnit, string> = {
  bag: "bags",
  kg: "kg",
  ton: "tons",
  cubic_ft: "cu ft",
  cubic_m: "cu m",
  piece: "pcs",
  box: "boxes",
  liter: "L",
  meter: "m",
  sq_ft: "sq ft",
  sq_m: "sq m",
  other: "units",
};

export function isMaterialUnit(value: string): value is MaterialUnit {
  return (MATERIAL_UNITS as readonly string[]).includes(value);
}

export const MATERIAL_STATUSES: readonly MaterialStatus[] = [
  "active",
  "inactive",
] as const;

export const MATERIAL_STATUS_LABELS: Record<MaterialStatus, string> = {
  active: "Active",
  inactive: "Inactive",
};

export function isMaterialStatus(value: string): value is MaterialStatus {
  return (MATERIAL_STATUSES as readonly string[]).includes(value);
}

export const MATERIAL_TRANSACTION_TYPES: readonly MaterialTransactionType[] = [
  "received",
  "used",
  "returned",
  "adjusted",
] as const;

export const MATERIAL_TRANSACTION_TYPE_LABELS: Record<
  MaterialTransactionType,
  string
> = {
  received: "Received",
  used: "Used",
  returned: "Returned",
  adjusted: "Adjusted",
};

export function isMaterialTransactionType(
  value: string,
): value is MaterialTransactionType {
  return (MATERIAL_TRANSACTION_TYPES as readonly string[]).includes(value);
}

export const ADJUSTMENT_DIRECTIONS: readonly AdjustmentDirection[] = [
  "increase",
  "decrease",
] as const;

export const ADJUSTMENT_DIRECTION_LABELS: Record<AdjustmentDirection, string> =
  {
    increase: "Increase",
    decrease: "Decrease",
  };

export function isAdjustmentDirection(
  value: string,
): value is AdjustmentDirection {
  return (ADJUSTMENT_DIRECTIONS as readonly string[]).includes(value);
}

export const STOCK_STATUSES = [
  "in_stock",
  "low_stock",
  "out_of_stock",
] as const;

export type StockStatus = (typeof STOCK_STATUSES)[number];

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};

export function isStockStatus(value: string): value is StockStatus {
  return (STOCK_STATUSES as readonly string[]).includes(value);
}

export const MATERIAL_DATE_PRESETS = [
  "today",
  "this_week",
  "this_month",
  "custom",
] as const;

export type MaterialDatePreset = (typeof MATERIAL_DATE_PRESETS)[number];

export const MATERIAL_DATE_PRESET_LABELS: Record<MaterialDatePreset, string> = {
  today: "Today",
  this_week: "This week",
  this_month: "This month",
  custom: "Custom range",
};

export function isMaterialDatePreset(
  value: string,
): value is MaterialDatePreset {
  return (MATERIAL_DATE_PRESETS as readonly string[]).includes(value);
}

export function materialToFormValues(material: Material) {
  return {
    name: material.name,
    category: material.category,
    unit: material.unit,
    default_unit_price:
      material.default_unit_price == null
        ? ""
        : String(material.default_unit_price),
    minimum_stock:
      material.minimum_stock == null ? "" : String(material.minimum_stock),
    notes: material.notes ?? "",
    vendor_id: material.vendor_id ?? "",
    status: material.status,
  };
}
