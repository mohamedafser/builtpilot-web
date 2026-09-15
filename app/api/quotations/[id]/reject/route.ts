import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import {
  quotationMutationStatus,
  revalidateQuotationPaths,
} from "@/lib/quotations/helpers";
import { markQuotationRejected } from "@/lib/quotations/mutations";
import { getQuotationById } from "@/lib/quotations/queries";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id } = await context.params;
  let values: unknown = {};

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      values = await request.json();
    } catch {
      return apiError("Invalid JSON body.", 400);
    }
  }

  const result = await markQuotationRejected(id, values);

  if ("error" in result) {
    return apiError(
      result.error,
      quotationMutationStatus(result.error, result.status),
    );
  }

  const existing = await getQuotationById(id);
  revalidateQuotationPaths(id, existing.quotation?.project_id);
  return apiSuccess("Quotation marked as rejected.", { id: result.id });
}
