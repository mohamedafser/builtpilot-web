import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { markAllNotificationsAsRead } from "@/lib/notifications/mutations";

export async function POST() {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const result = await markAllNotificationsAsRead();

  if ("error" in result) {
    return apiError(result.error, result.status ?? 400);
  }

  return apiSuccess("All notifications marked as read.", {
    updated: result.updated,
  });
}
