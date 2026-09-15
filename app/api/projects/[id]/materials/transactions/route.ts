import { apiError, apiSuccess } from "@/lib/api/response";
import { parsePagination } from "@/lib/api/pagination";
import { getApiWorkspace } from "@/lib/api/workspace";
import {
  getMaterialTransactions,
  parseTransactionSearchParams,
} from "@/lib/material-transactions/queries";
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
  const { transactions, error, page, pageSize, total, totalPages } =
    await getMaterialTransactions(
      parseTransactionSearchParams({
        from: searchParams.get("from") ?? undefined,
        to: searchParams.get("to") ?? undefined,
        material: searchParams.get("material") ?? undefined,
        vendor: searchParams.get("vendor") ?? undefined,
        type: searchParams.get("type") ?? undefined,
      }),
      parsePagination({
        page: searchParams.get("page"),
        page_size: searchParams.get("page_size"),
      }),
      id,
    );

  if (error === "not_found") {
    return apiError("Project not found.", 404);
  }

  if (error) {
    return apiError(error, 400);
  }

  return apiSuccess("Transactions loaded.", {
    transactions,
    page,
    pageSize,
    total,
    totalPages,
  });
}
