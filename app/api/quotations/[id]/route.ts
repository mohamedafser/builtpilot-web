import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import {
  quotationMutationStatus,
  quotationSavedMessage,
  revalidateQuotationPaths,
} from "@/lib/quotations/helpers";
import { updateQuotation } from "@/lib/quotations/mutations";
import { getQuotationById } from "@/lib/quotations/queries";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id } = await context.params;
  const result = await getQuotationById(id);

  if (result.error === "not_found") {
    return apiError("Quotation not found.", 404);
  }

  if (result.error || !result.quotation) {
    return apiError(result.error ?? "Unable to load quotation.", 500);
  }

  return apiSuccess("Quotation loaded.", { quotation: result.quotation });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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

  const result = await updateQuotation(id, values);

  if ("error" in result) {
    return apiError(
      result.error,
      quotationMutationStatus(result.error, result.status),
    );
  }

  const existing = await getQuotationById(id);
  revalidateQuotationPaths(id, existing.quotation?.project_id);
  return apiSuccess(
    quotationSavedMessage(
      result,
      values && typeof values === "object" && "submit_action" in values
        ? values.submit_action
        : undefined,
      "Quotation updated.",
    ),
    { id: result.id },
  );
}
