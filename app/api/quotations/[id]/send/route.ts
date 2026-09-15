import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import {
  quotationMutationStatus,
  revalidateQuotationPaths,
} from "@/lib/quotations/helpers";
import { markQuotationSent } from "@/lib/quotations/mutations";
import { getQuotationById } from "@/lib/quotations/queries";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id } = await context.params;
  const result = await markQuotationSent(id);

  if ("error" in result) {
    return apiError(
      result.error,
      quotationMutationStatus(result.error, result.status),
    );
  }

  const existing = await getQuotationById(id);
  revalidateQuotationPaths(id, existing.quotation?.project_id);
  return apiSuccess(
    result.emailedTo
      ? `Quotation emailed to ${result.emailedTo}.`
      : "Quotation marked as sent.",
    { id: result.id },
  );
}
