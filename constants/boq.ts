import type {
  Boq,
  BoqItem,
  BoqItemType,
  BoqMeasurementStatus,
  BoqStatus,
  BoqUnit,
  MaterialUnit,
} from "@/types";
import {
  CONSTRUCTION_UNIT_LABELS,
  CONSTRUCTION_UNIT_SHORT_LABELS,
  CONSTRUCTION_UNITS,
  isConstructionUnit,
} from "@/constants/units";

export const BOQ_STATUSES: readonly BoqStatus[] = [
  "draft",
  "active",
  "completed",
  "archived",
] as const;

export const BOQ_STATUS_LABELS: Record<BoqStatus, string> = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

export function isBoqStatus(value: string): value is BoqStatus {
  return (BOQ_STATUSES as readonly string[]).includes(value);
}

export const BOQ_ITEM_TYPES: readonly BoqItemType[] = [
  "material",
  "labour",
  "equipment",
  "work",
  "other",
] as const;

export const BOQ_ITEM_TYPE_LABELS: Record<BoqItemType, string> = {
  material: "Material",
  labour: "Labour",
  equipment: "Equipment",
  work: "Work",
  other: "Other",
};

export function isBoqItemType(value: string): value is BoqItemType {
  return (BOQ_ITEM_TYPES as readonly string[]).includes(value);
}

export const BOQ_UNITS = CONSTRUCTION_UNITS;
export const BOQ_UNIT_LABELS = CONSTRUCTION_UNIT_LABELS;
export const BOQ_UNIT_SHORT_LABELS = CONSTRUCTION_UNIT_SHORT_LABELS;

export function isBoqUnit(value: string): value is BoqUnit {
  return isConstructionUnit(value);
}

export function defaultUnitForBoqItemType(itemType: BoqItemType): BoqUnit {
  if (itemType === "labour") {
    return "day";
  }

  if (itemType === "material") {
    return "bag";
  }

  if (itemType === "equipment") {
    return "day";
  }

  if (itemType === "work") {
    return "sq_ft";
  }

  return "lot";
}

export type BoqTemplateDefinition = {
  id: string;
  name: string;
  description: string;
  sections: Array<{
    name: string;
    description?: string;
    items: Array<{
      item_code: string;
      item_type: BoqItemType;
      description: string;
      unit: BoqUnit;
      estimated_quantity: string;
      rate: string;
      notes?: string;
    }>;
  }>;
};

export const BOQ_TEMPLATE_LIBRARY: BoqTemplateDefinition[] = [
  {
    id: "residential-shell",
    name: "Residential Shell",
    description:
      "Typical substructure and superstructure package for a residential project.",
    sections: [
      {
        name: "Site Work",
        items: [
          {
            item_code: "SW-001",
            item_type: "work",
            description: "Site clearance and levelling",
            unit: "sq_ft",
            estimated_quantity: "2500",
            rate: "7.5",
          },
          {
            item_code: "SW-002",
            item_type: "equipment",
            description: "Excavator mobilization and idle time",
            unit: "day",
            estimated_quantity: "2",
            rate: "4500",
          },
        ],
      },
      {
        name: "Foundation",
        items: [
          {
            item_code: "FD-001",
            item_type: "material",
            description: "Cement for foundation work",
            unit: "bag",
            estimated_quantity: "220",
            rate: "380",
          },
          {
            item_code: "FD-002",
            item_type: "work",
            description: "Reinforcement placement and tying",
            unit: "kg",
            estimated_quantity: "1600",
            rate: "14",
          },
        ],
      },
      {
        name: "Masonry",
        items: [
          {
            item_code: "MS-001",
            item_type: "material",
            description: "Brick masonry work",
            unit: "sq_ft",
            estimated_quantity: "1800",
            rate: "80",
          },
          {
            item_code: "MS-002",
            item_type: "labour",
            description: "Masonry labour team",
            unit: "day",
            estimated_quantity: "18",
            rate: "2200",
          },
        ],
      },
      {
        name: "Plumbing",
        items: [
          {
            item_code: "PL-001",
            item_type: "material",
            description: "PVC pipe and fittings",
            unit: "piece",
            estimated_quantity: "120",
            rate: "180",
          },
          {
            item_code: "PL-002",
            item_type: "labour",
            description: "Plumbing installation labour",
            unit: "day",
            estimated_quantity: "7",
            rate: "2600",
          },
        ],
      },
    ],
  },
  {
    id: "civil-works",
    name: "Civil Works Package",
    description: "General civil package for structural and finishing works.",
    sections: [
      {
        name: "RCC",
        items: [
          {
            item_code: "RC-001",
            item_type: "material",
            description: "Ready mix concrete supply",
            unit: "cubic_m",
            estimated_quantity: "120",
            rate: "4400",
          },
          {
            item_code: "RC-002",
            item_type: "labour",
            description: "Concrete placing and finishing labour",
            unit: "day",
            estimated_quantity: "12",
            rate: "3000",
          },
        ],
      },
      {
        name: "Flooring",
        items: [
          {
            item_code: "FL-001",
            item_type: "material",
            description: "Tiles and adhesive",
            unit: "sq_ft",
            estimated_quantity: "1800",
            rate: "65",
          },
          {
            item_code: "FL-002",
            item_type: "work",
            description: "Tile laying and grouting",
            unit: "sq_ft",
            estimated_quantity: "1800",
            rate: "24",
          },
        ],
      },
      {
        name: "Painting",
        items: [
          {
            item_code: "PT-001",
            item_type: "material",
            description: "Primer and paint supply",
            unit: "liter",
            estimated_quantity: "180",
            rate: "220",
          },
          {
            item_code: "PT-002",
            item_type: "labour",
            description: "Surface preparation and painting labour",
            unit: "day",
            estimated_quantity: "10",
            rate: "2500",
          },
        ],
      },
    ],
  },
];

const QUOTATION_UNIT_TO_BOQ: Record<string, BoqUnit> = {
  sq_ft: "sq_ft",
  sq_m: "sq_m",
  cubic_ft: "cubic_ft",
  cubic_m: "cubic_m",
  meter: "meter",
  kg: "kg",
  ton: "ton",
  bag: "bag",
  piece: "piece",
  box: "piece",
  day: "day",
  hour: "hour",
  liter: "liter",
  lot: "lot",
  job: "lot",
  trip: "lot",
  load: "lot",
};

export function mapUnitToBoqUnit(unit: string | null | undefined): BoqUnit {
  if (!unit) {
    return "other";
  }

  const normalized = unit
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (isBoqUnit(normalized)) {
    return normalized;
  }

  return QUOTATION_UNIT_TO_BOQ[normalized] ?? "other";
}

export function mapMaterialUnitToBoqUnit(unit: MaterialUnit): BoqUnit {
  return mapUnitToBoqUnit(unit);
}

export const BOQ_MEASUREMENT_STATUSES: readonly BoqMeasurementStatus[] = [
  "active",
  "void",
] as const;

export const BOQ_MEASUREMENT_STATUS_LABELS: Record<
  BoqMeasurementStatus,
  string
> = {
  active: "Active",
  void: "Void",
};

export function isBoqMeasurementStatus(
  value: string,
): value is BoqMeasurementStatus {
  return (BOQ_MEASUREMENT_STATUSES as readonly string[]).includes(value);
}

export const BOQ_COMPLETION_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
] as const;

export type BoqCompletionStatus = (typeof BOQ_COMPLETION_STATUSES)[number];

export const BOQ_COMPLETION_STATUS_LABELS: Record<BoqCompletionStatus, string> =
  {
    not_started: "Not started",
    in_progress: "In progress",
    completed: "Completed",
  };

export function isBoqCompletionStatus(
  value: string,
): value is BoqCompletionStatus {
  return (BOQ_COMPLETION_STATUSES as readonly string[]).includes(value);
}

export function boqToFormValues(boq: Boq) {
  return {
    name: boq.name,
    description: boq.description ?? "",
  };
}

export function boqItemToFormValues(item: BoqItem) {
  return {
    section_id: item.section_id ?? "",
    item_code: item.item_code ?? "",
    description: item.description,
    item_type: item.item_type,
    material_id: item.material_id ?? "",
    unit: item.unit,
    estimated_quantity: String(item.estimated_quantity),
    rate: String(item.rate),
    notes: item.notes ?? "",
  };
}
