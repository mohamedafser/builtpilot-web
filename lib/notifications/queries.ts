import { getCurrentUser } from "@/lib/auth";
import { getWorkspaceScope } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import type { NotificationItem } from "@/lib/notifications/types";

export async function getNotifications(options?: {
  limit?: number;
  unreadOnly?: boolean;
}): Promise<{ items: NotificationItem[]; error: string | null }> {
  const user = await getCurrentUser();

  if (!user) {
    return { items: [], error: "You must be signed in to continue." };
  }

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { items: [], error: scope.message };
  }

  const limit = Math.min(Math.max(options?.limit ?? 30, 1), 50);
  const supabase = await createClient();
  let query = supabase
    .from("notifications")
    .select(
      "id, business_id, user_id, project_id, type, title, message, action_url, is_read, created_at",
    )
    .eq("business_id", scope.business.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;

  if (error) {
    return { items: [], error: "Unable to load notifications." };
  }

  return { items: (data ?? []) as NotificationItem[], error: null };
}

export async function getUnreadNotificationCount(): Promise<{
  count: number;
  error: string | null;
}> {
  const user = await getCurrentUser();

  if (!user) {
    return { count: 0, error: "You must be signed in to continue." };
  }

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { count: 0, error: scope.message };
  }

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("business_id", scope.business.id)
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    return { count: 0, error: "Unable to load unread count." };
  }

  return { count: count ?? 0, error: null };
}
