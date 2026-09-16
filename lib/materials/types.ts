import type { StockStatus } from "@/constants/material";
import type {
  AdjustmentDirection,
  Material,
  MaterialCategory,
  MaterialStatus,
  MaterialTransaction,
  MaterialTransactionType,
  MaterialUnit,
  Project,
  Vendor,
} from "@/types";

export type StockSummary = {
  current_stock: string;
  total_received: string;
  total_used: string;
  total_returned: string;
  stock_status: StockStatus;
};

export type MaterialCostSummary = {
  total_purchased_cost: string;
  total_used_cost: string;
  average_purchase_price: string | null;
  stock_value: string;
};

export type MaterialListItem = Material & {
  current_stock: string;
  stock_status: StockStatus;
  vendor_name: string | null;
  total_adjusted_increase: string;
  total_adjusted_decrease: string;
  last_adjustment: {
    direction: AdjustmentDirection;
    quantity: string;
    date: string;
  } | null;
};

export type MaterialProjectUsage = {
  project_id: string;
  project_name: string;
  current_stock: string;
  total_used: string;
  total_purchased_cost: string;
};

export type MaterialTransactionListItem = MaterialTransaction & {
  material_name: string;
  material_unit: MaterialUnit;
  project_name: string;
  vendor_name: string | null;
};

export type MaterialDetail = Material & {
  inventory: StockSummary;
  cost: MaterialCostSummary;
  vendor_name: string | null;
  project_usage: MaterialProjectUsage[];
  recent_transactions: MaterialTransactionListItem[];
};

export type MaterialFilters = {
  query?: string;
  status?: MaterialStatus;
  category?: MaterialCategory;
};

export type ProjectMaterialRow = {
  assignment_id: string;
  project_id: string;
  material: Material;
  planned_quantity: string | null;
  minimum_stock: string | null;
  effective_minimum_stock: string | null;
  current_stock: string;
  total_received: string;
  total_used: string;
  total_returned: string;
  total_adjusted_increase: string;
  total_adjusted_decrease: string;
  last_adjustment: {
    direction: AdjustmentDirection;
    quantity: string;
    date: string;
  } | null;
  latest_unit_price: string | null;
  vendor_name: string | null;
  stock_status: StockStatus;
  total_purchased_cost: string;
};

export type NamedCostTotal = {
  id: string;
  name: string;
  quantity: string;
  total_cost: string;
};

export type ProjectMaterialCostSummary = {
  from: string;
  to: string;
  total_purchases: number;
  total_material_cost: string;
  total_used_cost: string;
  material_types: number;
  stock_value: string;
  most_purchased: NamedCostTotal[];
  highest_cost: NamedCostTotal[];
  vendor_totals: NamedCostTotal[];
};

export type ProjectMaterialsDashboard = {
  assigned: ProjectMaterialRow[];
  totals: {
    material_cost: string;
    materials_in_use: number;
    low_stock: number;
    out_of_stock: number;
    stock_value: string;
  };
  cost: ProjectMaterialCostSummary;
  recent_transactions: MaterialTransactionListItem[];
};

export type MaterialTransactionFilters = {
  from?: string;
  to?: string;
  materialId?: string;
  vendorId?: string;
  type?: MaterialTransactionType;
};

export type { AdjustmentDirection, MaterialTransactionType, Project, Vendor };
