import { createAdminClient } from "@/lib/supabase/admin";
import { getWhatsAppProvider } from "@/lib/whatsapp/client";
import { getWhatsAppVerifyToken } from "@/lib/whatsapp/env";
import type {
  WhatsAppMessageStatus,
  WhatsAppStatusUpdate,
  WhatsAppWebhookVerification,
} from "@/lib/whatsapp/types";

const STATUS_RANK: Record<WhatsAppMessageStatus, number> = {
  queued: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
};

function canTransition(
  current: WhatsAppMessageStatus,
  next: WhatsAppMessageStatus,
): boolean {
  if (current === next) {
    return false;
  }

  if (current === "failed") {
    return false;
  }

  if (next === "failed") {
    return true;
  }

  return STATUS_RANK[next] > STATUS_RANK[current];
}

export function verifyWhatsAppWebhookChallenge(
  input: WhatsAppWebhookVerification,
): string | null {
  const expected = getWhatsAppVerifyToken();

  if (
    input.mode === "subscribe" &&
    input.token &&
    expected &&
    input.token === expected &&
    input.challenge
  ) {
    return input.challenge;
  }

  return null;
}

export function verifyWhatsAppWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const provider = getWhatsAppProvider();

  if (!provider) {
    return false;
  }

  // Mock provider allows local testing without app secret.
  if (provider.name === "mock") {
    return true;
  }

  return provider.verifyWebhookSignature(rawBody, signatureHeader);
}

export async function processWhatsAppWebhookPayload(
  payload: unknown,
): Promise<{ processed: number; ignored: number }> {
  const provider = getWhatsAppProvider();

  if (!provider) {
    return { processed: 0, ignored: 0 };
  }

  const { updates, ignored } = provider.processWebhook(payload);
  let processed = 0;

  for (const update of updates) {
    const applied = await applyStatusUpdate(update);
    if (applied) {
      processed += 1;
    }
  }

  return { processed, ignored };
}

async function applyStatusUpdate(update: WhatsAppStatusUpdate): Promise<boolean> {
  const admin = createAdminClient();

  // Webhook processing must use the service role (no user session).
  if (!admin) {
    return false;
  }

  const supabase = admin;

  const { data: existingEvent } = await supabase
    .from("whatsapp_webhook_events")
    .select("id")
    .eq("provider_event_id", update.providerEventId)
    .maybeSingle();

  if (existingEvent) {
    return false;
  }

  const { error: eventError } = await supabase
    .from("whatsapp_webhook_events")
    .insert({
      provider_event_id: update.providerEventId,
      provider_message_id: update.providerMessageId,
      event_type: update.status,
    });

  if (eventError) {
    // Unique violation = already processed
    if (eventError.code === "23505") {
      return false;
    }
    return false;
  }

  const { data: message } = await supabase
    .from("whatsapp_messages")
    .select("id, status, business_id, project_id, sent_by, message_type")
    .eq("provider_message_id", update.providerMessageId)
    .maybeSingle();

  if (!message) {
    return true;
  }

  if (!canTransition(message.status as WhatsAppMessageStatus, update.status)) {
    return true;
  }

  const patch: {
    status: WhatsAppMessageStatus;
    error_code?: string | null;
    error_message?: string | null;
    retryable?: boolean;
  } = {
    status: update.status,
  };

  if (update.status === "failed") {
    patch.error_code = update.errorCode ?? "provider_failed";
    patch.error_message =
      update.errorMessage?.slice(0, 500) ??
      "Message could not be delivered.";
    patch.retryable = false;
  }

  await supabase.from("whatsapp_messages").update(patch).eq("id", message.id);

  // Notify sender of delivery / failure (deduped).
  if (update.status === "delivered" || update.status === "failed") {
    const title =
      update.status === "delivered"
        ? "WhatsApp update delivered"
        : "WhatsApp message failed";
    const body =
      update.status === "delivered"
        ? "Your WhatsApp message was delivered."
        : "A WhatsApp message could not be delivered.";

    await supabase.from("notifications").insert({
      business_id: message.business_id,
      user_id: message.sent_by,
      project_id: message.project_id,
      type: "whatsapp",
      title,
      message: body,
      action_url: message.project_id
        ? `/projects/${message.project_id}/client-portal`
        : null,
      dedupe_key: `wa_status:${message.id}:${update.status}`,
    });
  }

  return true;
}
