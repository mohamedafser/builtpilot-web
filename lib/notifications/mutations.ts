import { getCurrentUser } from "@/lib/auth";
import { getWorkspaceScope } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import { isProjectUuid } from "@/lib/projects/helpers";

export async function markNotificationAsRead(
  notificationId: string,
): Promise<{ error: string; status?: number } | { success: true }> {
  if (!isProjectUuid(notificationId)) {
    return { error: "Notification not found.", status: 404 };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "You must be signed in to continue.", status: 401 };
  }

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { error: scope.message, status: 403 };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .eq("business_id", scope.business.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: "Unable to update notification." };
  }

  if (!data) {
    return { error: "Notification not found.", status: 404 };
  }

  return { success: true };
}

export async function markAllNotificationsAsRead(): Promise<
  { error: string; status?: number } | { success: true; updated: number }
> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "You must be signed in to continue.", status: 401 };
  }

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { error: scope.message, status: 403 };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("business_id", scope.business.id)
    .eq("is_read", false)
    .select("id");

  if (error) {
    return { error: "Unable to update notifications." };
  }

  return { success: true, updated: data?.length ?? 0 };
}
