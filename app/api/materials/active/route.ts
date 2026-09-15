import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { getActiveMaterials } from "@/lib/materials/queries";

export async function GET() {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { materials, error } = await getActiveMaterials();

  if (error) {
    return apiError(error, 500);
  }

  return apiSuccess("Materials loaded.", { materials });
}
