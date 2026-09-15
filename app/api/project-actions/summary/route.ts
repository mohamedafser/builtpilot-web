import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { getBusinessPendingActionSummary } from "@/lib/project-actions/queries";

export async function GET() {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { summary, error } = await getBusinessPendingActionSummary();

  if (error) {
    return apiError(error, 500);
  }

  return apiSuccess("Pending actions loaded.", summary);
}
