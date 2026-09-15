import type { Vendor, VendorStatus } from "@/types";
import type { MaterialTransactionListItem } from "@/lib/materials/types";
import type { VendorExpenseListItem } from "@/lib/expenses/types";

export type VendorPurchaseSummary = {
  purchase_count: number;
  total_purchase_cost: string;
};

export type VendorListItem = Vendor & VendorPurchaseSummary;

export type VendorProjectSupplied = {
  project_id: string;
  project_name: string;
  purchase_count: number;
  total_cost: string;
};

export type VendorDetail = Vendor &
  VendorPurchaseSummary & {
    projects_supplied: VendorProjectSupplied[];
    recent_purchases: MaterialTransactionListItem[];
    expense_count: number;
    total_expense_cost: string;
    recent_expenses: VendorExpenseListItem[];
  };

export type VendorFilters = {
  query?: string;
  status?: VendorStatus;
};
