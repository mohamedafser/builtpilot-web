import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { regenerateClientPortalLink } from "@/lib/client-portal/mutations";
import { revalidatePath } from "next/cache";
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
  const result = await regenerateClientPortalLink(id);

  if ("error" in result) {
    return apiError(result.error, result.status ?? 400);
  }

  revalidatePath(`/projects/${id}`);
  revalidatePath(`/projects/${id}/client-portal`);
  return apiSuccess("Client portal link regenerated.", {
    token: result.token ?? null,
  });
}
