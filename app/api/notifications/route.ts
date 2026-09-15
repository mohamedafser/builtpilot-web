import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import {
  getNotifications,
  getUnreadNotificationCount,
} from "@/lib/notifications/queries";

export async function GET(request: Request) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unread") === "1";
  const countOnly = url.searchParams.get("count") === "1";
  const limit = Number(url.searchParams.get("limit") ?? "30");

  if (countOnly) {
    const result = await getUnreadNotificationCount();

    if (result.error) {
      return apiError(result.error, 400);
    }

    return apiSuccess("Unread notification count.", { count: result.count });
  }

  const result = await getNotifications({
    limit: Number.isFinite(limit) ? limit : 30,
    unreadOnly,
  });

  if (result.error) {
    return apiError(result.error, 400);
  }

  const unread = await getUnreadNotificationCount();

  return apiSuccess("Notifications loaded.", {
    items: result.items,
    unread_count: unread.count,
  });
}
