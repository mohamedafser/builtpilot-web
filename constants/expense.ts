import type {
  ExpenseCategory,
  ExpensePaymentMethod,
  ExpenseStatus,
  ProjectExpense,
} from "@/types";

export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  "equipment",
  "transport",
  "fuel",
  "tools",
  "machinery",
  "permits",
  "subcontractor",
  "electricity",
  "water",
  "site_security",
  "accommodation",
  "food",
  "miscellaneous",
  "other",
] as const;

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  equipment: "Equipment",
  transport: "Transport",
  fuel: "Fuel",
  tools: "Tools",
  machinery: "Machinery",
  permits: "Permits",
  subcontractor: "Subcontractor",
  electricity: "Electricity",
  water: "Water",
  site_security: "Site security",
  accommodation: "Accommodation",
  food: "Food",
  miscellaneous: "Miscellaneous",
  other: "Other",
};

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(value);
}

export const EXPENSE_PAYMENT_METHODS: readonly ExpensePaymentMethod[] = [
  "cash",
  "bank_transfer",
  "upi",
  "card",
  "cheque",
  "other",
] as const;

export const EXPENSE_PAYMENT_METHOD_LABELS: Record<
  ExpensePaymentMethod,
  string
> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  upi: "UPI",
  card: "Card",
  cheque: "Cheque",
  other: "Other",
};

export function isExpensePaymentMethod(
  value: string,
): value is ExpensePaymentMethod {
  return (EXPENSE_PAYMENT_METHODS as readonly string[]).includes(value);
}

export const EXPENSE_STATUSES: readonly ExpenseStatus[] = [
  "active",
  "void",
] as const;

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  active: "Active",
  void: "Void",
};

export function isExpenseStatus(value: string): value is ExpenseStatus {
  return (EXPENSE_STATUSES as readonly string[]).includes(value);
}

export const EXPENSE_DATE_PRESETS = [
  "all",
  "today",
  "this_week",
  "this_month",
  "last_month",
  "custom",
] as const;

export type ExpenseDatePreset = (typeof EXPENSE_DATE_PRESETS)[number];

export const EXPENSE_DATE_PRESET_LABELS: Record<ExpenseDatePreset, string> = {
  all: "All dates",
  today: "Today",
  this_week: "This week",
  this_month: "This month",
  last_month: "Last month",
  custom: "Custom range",
};

export function isExpenseDatePreset(value: string): value is ExpenseDatePreset {
  return (EXPENSE_DATE_PRESETS as readonly string[]).includes(value);
}

export const COST_PERIOD_PRESETS = [
  "this_month",
  "last_month",
  "custom",
] as const;

export type CostPeriodPreset = (typeof COST_PERIOD_PRESETS)[number];

export const COST_PERIOD_PRESET_LABELS: Record<CostPeriodPreset, string> = {
  this_month: "Current month",
  last_month: "Previous month",
  custom: "Custom range",
};

export function isCostPeriodPreset(value: string): value is CostPeriodPreset {
  return (COST_PERIOD_PRESETS as readonly string[]).includes(value);
}

export const EXPENSE_RECEIPT_BUCKET = "expense-receipts";
export const MAX_EXPENSE_RECEIPT_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_EXPENSE_RECEIPT_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export function expenseToFormValues(expense: ProjectExpense) {
  return {
    category: expense.category,
    description: expense.description,
    amount: expense.amount == null ? "" : String(expense.amount),
    expense_date: expense.expense_date,
    vendor_id: expense.vendor_id ?? "",
    payment_method: expense.payment_method ?? "",
    reference_number: expense.reference_number ?? "",
    notes: expense.notes ?? "",
  };
}
