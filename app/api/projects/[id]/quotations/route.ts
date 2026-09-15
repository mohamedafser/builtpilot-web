import { parsePagination } from "@/lib/api/pagination";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import {
  quotationMutationStatus,
  quotationSavedMessage,
  revalidateQuotationPaths,
} from "@/lib/quotations/helpers";
import { createQuotation } from "@/lib/quotations/mutations";
import {
  getQuotations,
  parseQuotationSearchParams,
} from "@/lib/quotations/queries";
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
  const result = await getQuotations(
    parseQuotationSearchParams({
      q: searchParams.get("q") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      project_id: id,
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
    return apiError(result.error ?? "Unable to load quotations.", 500);
  }

  return apiSuccess("Quotations loaded.", result.result);
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

  const result = await createQuotation(values, id);

  if ("error" in result) {
    return apiError(
      result.error,
      quotationMutationStatus(result.error, result.status),
    );
  }

  revalidateQuotationPaths(result.id, id);
  return apiSuccess(
    quotationSavedMessage(
      result,
      values && typeof values === "object" && "submit_action" in values
        ? values.submit_action
        : undefined,
      "Quotation saved as draft.",
    ),
    { id: result.id },
    201,
  );
}
