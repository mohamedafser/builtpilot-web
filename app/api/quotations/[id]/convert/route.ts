import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import {
  quotationMutationStatus,
  revalidateQuotationPaths,
} from "@/lib/quotations/helpers";
import { convertQuotationToProject } from "@/lib/quotations/mutations";
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
  const result = await convertQuotationToProject(id);

  if ("error" in result) {
    return apiError(
      result.error,
      quotationMutationStatus(result.error, result.status),
    );
  }

  revalidateQuotationPaths(result.id, result.projectId);
  if (result.projectId) {
    revalidateQuotationPaths(undefined, result.projectId);
  }

  return apiSuccess("Quotation converted to a project.", {
    id: result.id,
    project_id: result.projectId,
  });
}
