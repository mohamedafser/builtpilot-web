import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { getActiveVendors } from "@/lib/vendors/queries";

export async function GET() {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { vendors, error } = await getActiveVendors();

  if (error) {
    return apiError(error, 500);
  }

  return apiSuccess("Vendors loaded.", { vendors });
}
