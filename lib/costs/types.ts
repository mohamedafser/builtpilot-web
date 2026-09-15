export type ProjectCostTotals = {
  labour_cost: string;
  material_cost: string;
  other_expenses: string;
  total_cost: string;
  labour_records: number;
  material_records: number;
  expense_records: number;
};

export type CostBreakdownItem = {
  label: string;
  amount: string;
  percent: number | null;
  has_records: boolean;
};

export type CostBreakdown = {
  labour: CostBreakdownItem;
  materials: CostBreakdownItem;
  expenses: CostBreakdownItem;
  total_cost: string;
};

export type BudgetStatus = "within_budget" | "over_budget" | "no_budget";

export type BudgetSummary = {
  estimated_budget: string | null;
  actual_cost: string;
  remaining_budget: string | null;
  budget_used_percent: number | null;
  status: BudgetStatus;
};

export type MonthlyCostSummary = {
  month_start: string;
  labour_cost: string;
  material_cost: string;
  other_expenses: string;
  total_cost: string;
};

export type ExpenseCategoryTotal = {
  category: string;
  label: string;
  amount: string;
  count: number;
};

export type ProjectCostDashboard = {
  totals: ProjectCostTotals;
  budget: BudgetSummary;
  breakdown: CostBreakdown;
  monthly: MonthlyCostSummary;
  trend: MonthlyCostSummary[];
  categories: ExpenseCategoryTotal[];
};

export type ProjectCostOverview = {
  project_id: string;
  project_name: string;
  estimated_budget: string | null;
  actual_cost: string;
  remaining_budget: string | null;
  budget_used_percent: number | null;
  status: BudgetStatus;
  labour_cost: string;
  material_cost: string;
  other_expenses: string;
};
