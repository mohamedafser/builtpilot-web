import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { getActiveWorkers } from "@/lib/workers/queries";

export async function GET() {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { workers, error } = await getActiveWorkers();

  if (error) {
    return apiError(error, 500);
  }

  return apiSuccess("Workers loaded.", { workers });
}
