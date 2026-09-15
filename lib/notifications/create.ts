import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  PREFERENCE_KEY_BY_TYPE,
  type NotificationPreferenceKey,
  type NotificationType,
} from "@/lib/notifications/types";

type CreateNotificationInput = {
  businessId: string;
  userId: string;
  projectId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string | null;
  dedupeKey?: string | null;
  preferenceKey?: NotificationPreferenceKey;
};

async function db() {
  return createAdminClient() ?? (await createClient());
}

async function isPreferenceEnabled(
  businessId: string,
  userId: string,
  key: NotificationPreferenceKey | undefined,
): Promise<boolean> {
  if (!key) {
    return true;
  }

  const supabase = await db();
  const { data } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    return DEFAULT_NOTIFICATION_PREFERENCES[key];
  }

  return Boolean(data[key]);
}

export async function notifyUser(
  input: CreateNotificationInput,
): Promise<void> {
  const preferenceKey =
    input.preferenceKey ?? PREFERENCE_KEY_BY_TYPE[input.type];

  const allowed = await isPreferenceEnabled(
    input.businessId,
    input.userId,
    preferenceKey,
  );

  if (!allowed) {
    return;
  }

  const supabase = await db();
  const { error } = await supabase.from("notifications").insert({
    business_id: input.businessId,
    user_id: input.userId,
    project_id: input.projectId ?? null,
    type: input.type,
    title: input.title.slice(0, 160),
    message: input.message.slice(0, 500),
    action_url: input.actionUrl?.slice(0, 500) ?? null,
    dedupe_key: input.dedupeKey?.slice(0, 200) ?? null,
  });

  // Ignore duplicate notification inserts (idempotent dedupe_key).
  if (error && error.code !== "23505") {
    return;
  }
}

export async function createBusinessNotifications(input: {
  businessId: string;
  projectId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string | null;
  dedupeKey?: string | null;
  preferenceKey?: NotificationPreferenceKey;
  /** Exclude this user (e.g. actor) from receiving the notification. */
  excludeUserId?: string | null;
}): Promise<void> {
  const supabase = await db();
  const { data: members } = await supabase
    .from("business_members")
    .select("user_id")
    .eq("business_id", input.businessId);

  for (const member of members ?? []) {
    if (input.excludeUserId && member.user_id === input.excludeUserId) {
      continue;
    }

    await notifyUser({
      businessId: input.businessId,
      userId: member.user_id,
      projectId: input.projectId,
      type: input.type,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl,
      dedupeKey: input.dedupeKey
        ? `${input.dedupeKey}:${member.user_id}`
        : null,
      preferenceKey: input.preferenceKey,
    });
  }
}
