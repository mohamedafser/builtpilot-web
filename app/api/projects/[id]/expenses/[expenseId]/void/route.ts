import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import {
  expenseMutationStatus,
  revalidateExpensePaths,
} from "@/lib/expenses/helpers";
import { voidProjectExpense } from "@/lib/expenses/mutations";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string; expenseId: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id, expenseId } = await context.params;
  const result = await voidProjectExpense(id, expenseId);

  if ("error" in result) {
    return apiError(
      result.error,
      expenseMutationStatus(result.error, result.status),
    );
  }

  revalidateExpensePaths(id, result.id);
  return apiSuccess("Expense voided.", { id: result.id });
}
