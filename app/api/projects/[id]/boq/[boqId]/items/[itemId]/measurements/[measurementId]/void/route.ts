import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { boqMutationStatus, revalidateBoqPaths } from "@/lib/boq/helpers";
import { voidBoqMeasurement } from "@/lib/boq/mutations";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
    boqId: string;
    itemId: string;
    measurementId: string;
  }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id, boqId, itemId, measurementId } = await context.params;
  const result = await voidBoqMeasurement(id, boqId, itemId, measurementId);

  if ("error" in result) {
    return apiError(result.error, boqMutationStatus(result.error, result.status));
  }

  revalidateBoqPaths(id, boqId);
  return apiSuccess("Measurement voided.", { id: result.id });
}
