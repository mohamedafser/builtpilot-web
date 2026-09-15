import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { boqMutationStatus, revalidateBoqPaths } from "@/lib/boq/helpers";
import { duplicateBoq } from "@/lib/boq/mutations";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string; boqId: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id, boqId } = await context.params;
  const result = await duplicateBoq(id, boqId);

  if ("error" in result) {
    return apiError(result.error, boqMutationStatus(result.error, result.status));
  }

  revalidateBoqPaths(id, result.id);
  return apiSuccess("BOQ duplicated.", { id: result.id }, 201);
}
