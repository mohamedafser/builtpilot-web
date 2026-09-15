import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { getAcceptedProjectQuotations } from "@/lib/boq/queries";
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
  const result = await getAcceptedProjectQuotations(id);

  if (result.error === "not_found") {
    return apiError("Project not found.", 404);
  }

  if (result.error) {
    return apiError(result.error, 500);
  }

  return apiSuccess("Accepted quotations loaded.", {
    quotations: result.quotations,
  });
}
