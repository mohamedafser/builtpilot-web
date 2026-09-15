import type {
  BudgetSummary,
  CostBreakdown,
  CostBreakdownItem,
  MonthlyCostSummary,
  ProjectCostTotals,
} from "./types";
import { addPaise, formatPaise, parseMoneyToPaise } from "@/lib/labour/money";

export function moneyToPaise(value: string | number | null | undefined): number {
  if (value == null || value === "") {
    return 0;
  }

  return parseMoneyToPaise(value) ?? 0;
}

export function sharePercent(partPaise: number, totalPaise: number): number | null {
  if (totalPaise <= 0) {
    return null;
  }

  return Math.round((partPaise / totalPaise) * 1000) / 10;
}

function breakdownItem(
  label: string,
  paise: number,
  totalPaise: number,
  hasRecords: boolean,
): CostBreakdownItem {
  return {
    label,
    amount: formatPaise(paise),
    percent: sharePercent(paise, totalPaise),
    has_records: hasRecords,
  };
}

export function buildProjectCostTotals(input: {
  labour: string | number;
  material: string | number;
  expense: string | number;
  labourRecords: number;
  materialRecords: number;
  expenseRecords: number;
}): ProjectCostTotals {
  const labourPaise = moneyToPaise(input.labour);
  const materialPaise = moneyToPaise(input.material);
  const expensePaise = moneyToPaise(input.expense);
  const totalPaise = addPaise([
    formatPaise(labourPaise),
    formatPaise(materialPaise),
    formatPaise(expensePaise),
  ]);

  return {
    labour_cost: formatPaise(labourPaise),
    material_cost: formatPaise(materialPaise),
    other_expenses: formatPaise(expensePaise),
    total_cost: formatPaise(totalPaise),
    labour_records: input.labourRecords,
    material_records: input.materialRecords,
    expense_records: input.expenseRecords,
  };
}

export function buildCostBreakdown(totals: ProjectCostTotals): CostBreakdown {
  const labourPaise = moneyToPaise(totals.labour_cost);
  const materialPaise = moneyToPaise(totals.material_cost);
  const expensePaise = moneyToPaise(totals.other_expenses);
  const totalPaise = moneyToPaise(totals.total_cost);

  return {
    labour: breakdownItem(
      "Labour",
      labourPaise,
      totalPaise,
      totals.labour_records > 0,
    ),
    materials: breakdownItem(
      "Materials",
      materialPaise,
      totalPaise,
      totals.material_records > 0,
    ),
    expenses: breakdownItem(
      "Other expenses",
      expensePaise,
      totalPaise,
      totals.expense_records > 0,
    ),
    total_cost: totals.total_cost,
  };
}

export function buildBudgetSummary(
  estimatedBudget: string | number | null | undefined,
  actualCost: string,
): BudgetSummary {
  const estimatedPaise =
    estimatedBudget == null || estimatedBudget === ""
      ? null
      : moneyToPaise(estimatedBudget);
  const actualPaise = moneyToPaise(actualCost);
  const hasBudget = estimatedPaise != null && estimatedPaise > 0;

  if (!hasBudget || estimatedPaise == null) {
    return {
      estimated_budget:
        estimatedBudget == null || estimatedBudget === ""
          ? null
          : formatPaise(estimatedPaise ?? 0),
      actual_cost: actualCost,
      remaining_budget: null,
      budget_used_percent: null,
      status: "no_budget",
    };
  }

  const remainingPaise = estimatedPaise - actualPaise;
  const overBudget = actualPaise > estimatedPaise;

  return {
    estimated_budget: formatPaise(estimatedPaise),
    actual_cost: actualCost,
    remaining_budget: formatPaise(remainingPaise),
    budget_used_percent:
      Math.round((actualPaise / estimatedPaise) * 1000) / 10,
    status: overBudget ? "over_budget" : "within_budget",
  };
}

export function buildMonthlySummary(
  monthStart: string,
  labour: string | number,
  material: string | number,
  expense: string | number,
): MonthlyCostSummary {
  const totals = buildProjectCostTotals({
    labour,
    material,
    expense,
    labourRecords: 0,
    materialRecords: 0,
    expenseRecords: 0,
  });

  return {
    month_start: monthStart,
    labour_cost: totals.labour_cost,
    material_cost: totals.material_cost,
    other_expenses: totals.other_expenses,
    total_cost: totals.total_cost,
  };
}
