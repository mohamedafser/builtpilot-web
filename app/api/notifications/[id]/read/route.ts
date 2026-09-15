import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { markNotificationAsRead } from "@/lib/notifications/mutations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id } = await context.params;
  const result = await markNotificationAsRead(id);

  if ("error" in result) {
    return apiError(result.error, result.status ?? 400);
  }

  return apiSuccess("Notification marked as read.", { id });
}
