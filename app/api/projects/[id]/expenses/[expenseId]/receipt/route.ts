import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import {
  expenseMutationStatus,
  revalidateExpensePaths,
} from "@/lib/expenses/helpers";
import {
  deleteExpenseReceipt,
  uploadExpenseReceipt,
} from "@/lib/expenses/receipts";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string; expenseId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id, expenseId } = await context.params;
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return apiError("Invalid upload. Please try again.", 400);
  }

  const fileValue = formData.get("file");

  if (!(fileValue instanceof File)) {
    return apiError("Choose a receipt to upload.");
  }

  const result = await uploadExpenseReceipt(id, expenseId, fileValue);

  if ("error" in result) {
    return apiError(
      result.error,
      expenseMutationStatus(result.error, result.status),
    );
  }

  revalidateExpensePaths(id, expenseId, result.expense.vendor_id);
  return apiSuccess("Receipt uploaded.", { expense: result.expense }, 201);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id, expenseId } = await context.params;
  const result = await deleteExpenseReceipt(id, expenseId);

  if ("error" in result) {
    return apiError(
      result.error,
      expenseMutationStatus(result.error, result.status),
    );
  }

  revalidateExpensePaths(id, expenseId);
  return apiSuccess("Receipt removed.", { id: expenseId });
}
