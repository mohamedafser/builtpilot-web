import type { PaginationMeta } from "@/lib/api/pagination";
import type { BoqCompletionStatus } from "@/constants/boq";
import type {
  Boq,
  BoqItem,
  BoqItemType,
  BoqMeasurement,
  BoqSection,
  BoqStatus,
  BoqUnit,
} from "@/types";

export type BoqSummary = {
  item_count: number;
  estimated_quantity: string;
  estimated_value: string;
  completed_value: string;
  remaining_value: string;
  completion_percentage: number | null;
};

export type BoqSectionSummary = BoqSection & {
  item_count: number;
  estimated_value: string;
  completed_value: string;
  remaining_value: string;
  completion_percentage: number | null;
};

export type BoqItemProgress = BoqItem & {
  section_name: string | null;
  remaining_quantity: string;
  completed_value: string;
  remaining_value: string;
  completion_percentage: number | null;
  completion_status: BoqCompletionStatus;
  material_name: string | null;
};

export type MeasurementSummary = BoqMeasurement & {
  item_description: string;
  item_code: string | null;
  section_name: string | null;
  measured_by_name: string | null;
};

export type EstimateVsActual = {
  quotation_value: string | null;
  quotation_number: string | null;
  boq_estimated_value: string;
  actual_cost: string;
  difference: string;
};

export type BoqListItem = Boq & {
  summary: BoqSummary;
};

export type BoqListResult = {
  boqs: BoqListItem[];
  dashboard: BoqDashboard;
} & PaginationMeta;

export type BoqDashboard = {
  summary: BoqSummary;
  estimate_vs_actual: EstimateVsActual | null;
  top_completed_sections: BoqSectionSummary[];
  remaining_sections: BoqSectionSummary[];
  recent_measurements: MeasurementSummary[];
};

export type BoqDetail = Boq & {
  sections: BoqSectionSummary[];
  items: BoqItemProgress[];
  unsectioned_items: BoqItemProgress[];
  summary: BoqSummary;
  created_by_name: string | null;
  estimate_vs_actual: EstimateVsActual | null;
};

export type BoqItemDetail = {
  boq: BoqDetail;
  item: BoqItemProgress;
  section: BoqSection | null;
};

export type BoqMeasurementListResult = {
  measurements: MeasurementSummary[];
  total_quantity: string;
} & PaginationMeta;

export type BoqFilters = {
  query?: string;
  status?: BoqStatus | "all";
};

export type BoqItemFilters = {
  query?: string;
  sectionId?: string;
  itemType?: BoqItemType | "all";
  completion?: BoqCompletionStatus | "all";
};

export type BoqActions = {
  edit: boolean;
  activate: boolean;
  complete: boolean;
  archive: boolean;
  duplicate: boolean;
  measure: boolean;
};

export type BoqItemInput = {
  section_id: string | null;
  item_code: string | null;
  description: string;
  item_type: BoqItemType;
  material_id: string | null;
  unit: BoqUnit;
  estimated_quantity: string;
  rate: string;
  notes: string | null;
};

export type CalculatedBoqItem = BoqItemInput & {
  estimated_amount: string;
  sort_order: number;
};
