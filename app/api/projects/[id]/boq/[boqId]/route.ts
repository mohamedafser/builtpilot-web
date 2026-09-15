import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { boqMutationStatus, revalidateBoqPaths } from "@/lib/boq/helpers";
import { updateBoq } from "@/lib/boq/mutations";
import { getBoqById } from "@/lib/boq/queries";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string; boqId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id, boqId } = await context.params;
  const result = await getBoqById(id, boqId);

  if (result.error === "not_found") {
    return apiError("BOQ not found.", 404);
  }

  if (result.error || !result.boq) {
    return apiError(result.error ?? "Unable to load this BOQ.", 500);
  }

  return apiSuccess("BOQ loaded.", { boq: result.boq });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id, boqId } = await context.params;
  let values: unknown;

  try {
    values = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const result = await updateBoq(id, boqId, values);

  if ("error" in result) {
    return apiError(result.error, boqMutationStatus(result.error, result.status));
  }

  revalidateBoqPaths(id, boqId);
  return apiSuccess("BOQ updated.", { id: result.id });
}
