import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { writeMaterialsAdjustmentsSeenAt } from "@/lib/materials/adjustments-seen-server";

export async function POST() {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const seenAt = await writeMaterialsAdjustmentsSeenAt();

  return apiSuccess("Materials adjustments marked as seen.", { seenAt });
}
