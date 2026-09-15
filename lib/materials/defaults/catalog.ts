import type { MaterialCategory, MaterialUnit } from "@/types";

export type DefaultMaterialSeed = {
  name: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  /** Optional illustrative catalog price; null means user fills later. */
  default_unit_price: string | null;
  minimum_stock: string | null;
  notes: string | null;
};

const SHARED_DEFAULTS: DefaultMaterialSeed[] = [
  {
    name: "OPC Cement 50kg",
    category: "cement",
    unit: "bag",
    default_unit_price: null,
    minimum_stock: "50",
    notes: "Default catalog item",
  },
  {
    name: "TMT Steel",
    category: "steel",
    unit: "kg",
    default_unit_price: null,
    minimum_stock: "500",
    notes: "Default catalog item",
  },
  {
    name: "PVC Pipe",
    category: "plumbing",
    unit: "meter",
    default_unit_price: null,
    minimum_stock: "20",
    notes: "Default catalog item",
  },
  {
    name: "Electrical Cable",
    category: "electrical",
    unit: "meter",
    default_unit_price: null,
    minimum_stock: "50",
    notes: "Default catalog item",
  },
  {
    name: "Emulsion Paint",
    category: "paint",
    unit: "liter",
    default_unit_price: null,
    minimum_stock: "20",
    notes: "Default catalog item",
  },
  {
    name: "Hardware & fasteners",
    category: "hardware",
    unit: "other",
    default_unit_price: null,
    minimum_stock: null,
    notes: "Default catalog item",
  },
  {
    name: "Waterproofing compound",
    category: "other",
    unit: "kg",
    default_unit_price: null,
    minimum_stock: "10",
    notes: "Default catalog item",
  },
];

const INDIA_DEFAULTS: DefaultMaterialSeed[] = [
  ...SHARED_DEFAULTS,
  {
    name: "M-Sand / River sand",
    category: "sand",
    unit: "cubic_ft",
    default_unit_price: null,
    minimum_stock: "200",
    notes: "Default catalog item",
  },
  {
    name: "20mm Aggregate / Jelly",
    category: "aggregate",
    unit: "cubic_ft",
    default_unit_price: null,
    minimum_stock: "200",
    notes: "Default catalog item",
  },
  {
    name: "Red bricks",
    category: "bricks",
    unit: "piece",
    default_unit_price: null,
    minimum_stock: "1000",
    notes: "Default catalog item",
  },
  {
    name: "Concrete blocks",
    category: "blocks",
    unit: "piece",
    default_unit_price: null,
    minimum_stock: "200",
    notes: "Default catalog item",
  },
  {
    name: "Floor tiles",
    category: "tiles",
    unit: "sq_ft",
    default_unit_price: null,
    minimum_stock: "100",
    notes: "Default catalog item",
  },
  {
    name: "Plywood / shuttering",
    category: "wood",
    unit: "sq_ft",
    default_unit_price: null,
    minimum_stock: "50",
    notes: "Default catalog item",
  },
];

const UAE_DEFAULTS: DefaultMaterialSeed[] = [
  ...SHARED_DEFAULTS,
  {
    name: "Washed sand",
    category: "sand",
    unit: "cubic_m",
    default_unit_price: null,
    minimum_stock: "10",
    notes: "Default catalog item",
  },
  {
    name: "20mm Aggregate",
    category: "aggregate",
    unit: "cubic_m",
    default_unit_price: null,
    minimum_stock: "10",
    notes: "Default catalog item",
  },
  {
    name: "Concrete blocks",
    category: "blocks",
    unit: "piece",
    default_unit_price: null,
    minimum_stock: "200",
    notes: "Default catalog item",
  },
  {
    name: "Floor tiles",
    category: "tiles",
    unit: "sq_m",
    default_unit_price: null,
    minimum_stock: "20",
    notes: "Default catalog item",
  },
  {
    name: "Plywood / formwork",
    category: "wood",
    unit: "sq_m",
    default_unit_price: null,
    minimum_stock: "20",
    notes: "Default catalog item",
  },
];

export function getDefaultMaterialsForCountry(
  countryCode?: string | null,
): DefaultMaterialSeed[] {
  const code = String(countryCode ?? "IN").trim().toUpperCase();
  if (code === "AE") {
    return UAE_DEFAULTS.map((item) => ({ ...item }));
  }
  return INDIA_DEFAULTS.map((item) => ({ ...item }));
}
