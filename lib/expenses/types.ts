import type { PaginationMeta } from "@/lib/api/pagination";
import type {
  ExpenseCategory,
  ExpensePaymentMethod,
  ExpenseStatus,
  ProjectExpense,
} from "@/types";

export type ExpenseListItem = ProjectExpense & {
  vendor_name: string | null;
  created_by_name: string | null;
  receipt_url: string | null;
};

export type ExpenseDetail = ExpenseListItem;

export type ExpenseFilters = {
  query?: string;
  from?: string;
  to?: string;
  category?: ExpenseCategory;
  vendorId?: string;
  paymentMethod?: ExpensePaymentMethod;
  status?: ExpenseStatus | "all";
};

export type ExpenseStats = {
  total_amount: string;
  this_month_amount: string;
  today_amount: string;
  active_count: number;
};

export type ExpenseListResult = {
  expenses: ExpenseListItem[];
  stats: ExpenseStats;
} & PaginationMeta;

export type VendorExpenseSummary = {
  expense_count: number;
  total_expense_cost: string;
};

export type VendorExpenseListItem = {
  id: string;
  project_id: string;
  project_name: string;
  category: ExpenseCategory;
  description: string;
  amount: string;
  expense_date: string;
  status: ExpenseStatus;
};
