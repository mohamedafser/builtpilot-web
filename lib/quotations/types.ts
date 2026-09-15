import type { PaginationMeta } from "@/lib/api/pagination";
import type {
  DiscountType,
  Quotation,
  QuotationItem,
  QuotationItemType,
  QuotationStatus,
} from "@/types";

export type QuotationListItem = Quotation & {
  project_name: string | null;
  effective_status: QuotationStatus;
  item_count: number;
};

export type QuotationCostBreakdown = {
  materials: string;
  labour: string;
  other: string;
  total: string;
  material_count: number;
  labour_count: number;
  other_count: number;
};

export type EstimateVsActualLine = {
  estimated: string;
  actual: string;
  difference: string;
  variance_percentage: number | null;
  over_estimate: boolean;
};

export type EstimateVsActual = {
  total: EstimateVsActualLine;
  labour: EstimateVsActualLine;
  materials: EstimateVsActualLine;
  other: EstimateVsActualLine;
};

export type QuotationDetail = Quotation & {
  items: QuotationItem[];
  project_name: string | null;
  created_by_name: string | null;
  business_name: string;
  effective_status: QuotationStatus;
  breakdown: QuotationCostBreakdown;
  estimate_vs_actual: EstimateVsActual | null;
};

export type QuotationFilters = {
  query?: string;
  from?: string;
  to?: string;
  status?: QuotationStatus | "all";
  projectId?: string;
};

export type QuotationStats = {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  rejected: number;
  expired: number;
  cancelled: number;
  accepted_value: string;
};

export type QuotationListResult = {
  quotations: QuotationListItem[];
  stats: QuotationStats;
} & PaginationMeta;

export type QuotationActions = {
  edit: boolean;
  send: boolean;
  accept: boolean;
  reject: boolean;
  cancel: boolean;
  duplicate: boolean;
  convert: boolean;
  viewProject: boolean;
};

export type QuotationLineInput = {
  item_type: QuotationItemType;
  material_id: string | null;
  worker_id: string | null;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  notes: string | null;
};

export type QuotationTotals = {
  subtotal: string;
  discount_type: DiscountType | null;
  discount_value: string;
  discount_amount: string;
  tax_percentage: string | null;
  tax_amount: string;
  total_amount: string;
};

export type CalculatedQuotationItem = QuotationLineInput & {
  total_amount: string;
  sort_order: number;
};
