import { parsePagination } from "@/lib/api/pagination";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import {
  expenseMutationStatus,
  revalidateExpensePaths,
} from "@/lib/expenses/helpers";
import { createProjectExpense } from "@/lib/expenses/mutations";
import {
  getProjectExpenses,
  parseExpenseSearchParams,
} from "@/lib/expenses/queries";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id } = await context.params;
  const { searchParams } = request.nextUrl;
  const result = await getProjectExpenses(
    id,
    parseExpenseSearchParams({
      q: searchParams.get("q") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      vendor_id: searchParams.get("vendor_id") ?? undefined,
      payment_method: searchParams.get("payment_method") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    }),
    parsePagination({
      page: searchParams.get("page"),
      page_size: searchParams.get("page_size"),
    }),
  );

  if (result.error === "not_found") {
    return apiError("Project not found.", 404);
  }

  if (result.error || !result.result) {
    return apiError(result.error ?? "Unable to load expenses.", 500);
  }

  return apiSuccess("Expenses loaded.", result.result);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id } = await context.params;
  let values: unknown;

  try {
    values = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const result = await createProjectExpense(id, values);

  if ("error" in result) {
    return apiError(
      result.error,
      expenseMutationStatus(result.error, result.status),
    );
  }

  revalidateExpensePaths(id, result.id);
  return apiSuccess("Expense recorded.", { id: result.id }, 201);
}
