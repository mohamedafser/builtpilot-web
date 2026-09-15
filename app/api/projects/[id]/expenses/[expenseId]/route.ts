import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import {
  expenseMutationStatus,
  revalidateExpensePaths,
} from "@/lib/expenses/helpers";
import { updateProjectExpense } from "@/lib/expenses/mutations";
import { getExpenseById } from "@/lib/expenses/queries";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string; expenseId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id, expenseId } = await context.params;
  const result = await getExpenseById(id, expenseId);

  if (result.error === "not_found") {
    return apiError("Expense not found.", 404);
  }

  if (result.error || !result.expense) {
    return apiError(result.error ?? "Unable to load this expense.", 400);
  }

  return apiSuccess("Expense loaded.", { expense: result.expense });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id, expenseId } = await context.params;
  let values: unknown;

  try {
    values = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const result = await updateProjectExpense(id, expenseId, values);

  if ("error" in result) {
    return apiError(
      result.error,
      expenseMutationStatus(result.error, result.status),
    );
  }

  revalidateExpensePaths(id, result.id);
  return apiSuccess("Expense updated.", { id: result.id });
}
