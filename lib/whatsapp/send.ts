import { getCurrentUser } from "@/lib/auth";
import {
  createBusinessNotifications,
  notifyUser,
} from "@/lib/notifications/create";
import { getProjectById } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import { getWhatsAppProvider } from "@/lib/whatsapp/client";
import { isWhatsAppConfigured } from "@/lib/whatsapp/env";
import { isWhatsAppFeatureEnabled } from "@/lib/whatsapp/feature";
import { checkWhatsAppRateLimit } from "@/lib/whatsapp/rate-limit";
import { isTemplateRequired, resolveProviderTemplateName } from "@/lib/whatsapp/templates";
import type {
  WhatsAppEligibility,
  WhatsAppMessageType,
  WhatsAppTemplateName,
} from "@/lib/whatsapp/types";
import { normalizeWhatsAppPhone } from "@/lib/whatsapp/validation";
import { isProjectUuid } from "@/lib/projects/helpers";

export type SendWhatsAppInput = {
  projectId: string;
  messageType: WhatsAppMessageType;
  content: string;
  idempotencyKey?: string;
  /** When true, require an active client portal (portal_link / updates with link). */
  requireActivePortal?: boolean;
  useTemplate?: boolean;
  template?: WhatsAppTemplateName;
  /** Optional override phone — still validated server-side. */
  recipientPhone?: string;
};

export type SendWhatsAppResult =
  | {
      ok: true;
      messageId: string;
      status: string;
      recipientPhone: string;
    }
  | {
      ok: false;
      error: string;
      status?: number;
      retryable?: boolean;
    };

async function loadCommunicationContext(projectId: string) {
  if (!isProjectUuid(projectId)) {
    return { error: "Project not found.", status: 404 as const };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      error:
        projectResult.error === "not_found"
          ? "Project not found."
          : projectResult.error,
      status: (projectResult.error === "not_found" ? 404 : 400) as 400 | 404,
    };
  }

  const supabase = await createClient();
  const { data: access, error } = await supabase
    .from("project_client_access")
    .select(
      "id, client_name, client_phone, whatsapp_enabled, whatsapp_phone, whatsapp_opted_in, whatsapp_opted_in_at, is_active, expires_at",
    )
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { error: "Unable to load client communication settings.", status: 400 as const };
  }

  return {
    project: projectResult.project,
    access,
  };
}

export function evaluateWhatsAppEligibility(input: {
  access: {
    whatsapp_enabled: boolean;
    whatsapp_phone: string | null;
    client_phone: string | null;
    whatsapp_opted_in: boolean;
    is_active: boolean;
    expires_at: string | null;
  } | null;
  requireActivePortal?: boolean;
  overridePhone?: string | null;
}): WhatsAppEligibility {
  if (!input.access) {
    return {
      canSend: false,
      reason: "WhatsApp sharing is not enabled for this client.",
      phone: null,
      whatsappEnabled: false,
      optedIn: false,
      portalActive: false,
    };
  }

  const portalActive =
    input.access.is_active &&
    (!input.access.expires_at ||
      new Date(input.access.expires_at).getTime() > Date.now());

  if (input.requireActivePortal && !portalActive) {
    return {
      canSend: false,
      reason: "Client portal access is currently disabled.",
      phone: null,
      whatsappEnabled: input.access.whatsapp_enabled,
      optedIn: input.access.whatsapp_opted_in,
      portalActive: false,
    };
  }

  if (!input.access.whatsapp_enabled || !input.access.whatsapp_opted_in) {
    return {
      canSend: false,
      reason: "WhatsApp updates are not enabled for this client.",
      phone: null,
      whatsappEnabled: input.access.whatsapp_enabled,
      optedIn: input.access.whatsapp_opted_in,
      portalActive,
    };
  }

  const rawPhone =
    input.overridePhone?.trim() ||
    input.access.whatsapp_phone?.trim() ||
    input.access.client_phone?.trim() ||
    "";

  const phone = normalizeWhatsAppPhone(rawPhone);

  if (!phone.ok) {
    return {
      canSend: false,
      reason: phone.error,
      phone: null,
      whatsappEnabled: true,
      optedIn: true,
      portalActive,
    };
  }

  return {
    canSend: true,
    reason: null,
    phone: phone.e164,
    whatsappEnabled: true,
    optedIn: true,
    portalActive,
  };
}

export async function sendProjectWhatsAppMessage(
  input: SendWhatsAppInput,
): Promise<SendWhatsAppResult> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, error: "You must be signed in to continue.", status: 401 };
  }

  if (!isWhatsAppFeatureEnabled()) {
    return {
      ok: false,
      error: "WhatsApp messaging is temporarily unavailable. Share the portal link instead.",
      status: 503,
    };
  }

  if (!isWhatsAppConfigured()) {
    return {
      ok: false,
      error: "WhatsApp is temporarily unavailable. Please try again.",
      status: 503,
      retryable: true,
    };
  }

  const provider = getWhatsAppProvider();

  if (!provider) {
    return {
      ok: false,
      error: "WhatsApp is temporarily unavailable. Please try again.",
      status: 503,
      retryable: true,
    };
  }

  const content = input.content.trim();

  if (!content || content.length > 3500) {
    return {
      ok: false,
      error: "Message content is required and must be under 3500 characters.",
    };
  }

  // Strip HTML / unsafe markup
  if (/<[^>]+>/.test(content)) {
    return {
      ok: false,
      error: "Message content cannot include HTML.",
    };
  }

  const ctx = await loadCommunicationContext(input.projectId);

  if ("error" in ctx && typeof ctx.error === "string") {
    return {
      ok: false,
      error: ctx.error,
      status: "status" in ctx && typeof ctx.status === "number" ? ctx.status : 400,
    };
  }

  if (!("project" in ctx)) {
    return { ok: false, error: "Unable to load project communication settings." };
  }

  const requirePortal =
    input.requireActivePortal ??
    (input.messageType === "portal_link" ||
      input.messageType === "client_update" ||
      input.messageType === "daily_report");

  const eligibility = evaluateWhatsAppEligibility({
    access: ctx.access,
    requireActivePortal: requirePortal,
    overridePhone: input.recipientPhone,
  });

  if (!eligibility.canSend || !eligibility.phone) {
    const reason = eligibility.reason ?? "WhatsApp sharing is not enabled for this client.";
    const status =
      reason.includes("portal") && reason.toLowerCase().includes("disabled")
        ? ("Enable the client portal before sharing the portal link." as const)
        : reason;

    return {
      ok: false,
      error:
        input.messageType === "portal_link" && !eligibility.portalActive
          ? "Enable the client portal before sharing the portal link."
          : status,
    };
  }

  const rate = checkWhatsAppRateLimit({
    userId: user.id,
    businessId: ctx.project.business_id,
    projectId: ctx.project.id,
  });

  if (!rate.allowed) {
    return {
      ok: false,
      error: `Too many WhatsApp messages. Try again in ${rate.retryAfterSeconds}s.`,
      status: 429,
      retryable: true,
    };
  }

  const supabase = await createClient();
  const idempotencyKey = input.idempotencyKey?.trim().slice(0, 120) || null;
  const recipientPhone = eligibility.phone;
  const project = ctx.project;
  const activeProvider = provider;
  const actor = user;

  async function deliverQueuedMessage(queuedId: string): Promise<SendWhatsAppResult> {
    const useTemplate = isTemplateRequired({
      forceTemplate: input.useTemplate,
    });

    const providerIdempotencyKey = `${idempotencyKey ?? queuedId}:${Date.now()}`;

    const sendResult =
      useTemplate && input.template
        ? await activeProvider.sendTemplateMessage({
            to: recipientPhone,
            templateName: resolveProviderTemplateName(input.template),
            idempotencyKey: providerIdempotencyKey,
          })
        : await activeProvider.sendTextMessage({
            to: recipientPhone,
            body: content,
            idempotencyKey: providerIdempotencyKey,
          });

    if (!sendResult.ok) {
      await supabase
        .from("whatsapp_messages")
        .update({
          status: "failed",
          error_code: sendResult.errorCode,
          error_message: sendResult.errorMessage.slice(0, 500),
          retryable: sendResult.retryable,
        })
        .eq("id", queuedId);

      await notifyUser({
        businessId: project.business_id,
        userId: actor.id,
        projectId: project.id,
        type: "whatsapp",
        title: "WhatsApp message failed",
        message: `Message to ${project.name} client could not be sent.`,
        actionUrl: `/projects/${project.id}/client-portal`,
        dedupeKey: `wa_failed:${queuedId}:${Date.now()}`,
        preferenceKey: "whatsapp_notifications",
      });

      return {
        ok: false,
        error: sendResult.errorMessage,
        retryable: sendResult.retryable,
      };
    }

    await supabase
      .from("whatsapp_messages")
      .update({
        status: sendResult.status,
        provider_message_id: sendResult.providerMessageId,
        error_code: null,
        error_message: null,
        retryable: false,
      })
      .eq("id", queuedId);

    await createBusinessNotifications({
      businessId: project.business_id,
      projectId: project.id,
      type: "whatsapp",
      title: "WhatsApp message sent",
      message: `A ${input.messageType.replace(/_/g, " ")} was sent for ${project.name}.`,
      actionUrl: `/projects/${project.id}/client-portal`,
      dedupeKey: `wa_sent:${queuedId}`,
      preferenceKey: "whatsapp_notifications",
    });

    return {
      ok: true,
      messageId: queuedId,
      status: sendResult.status,
      recipientPhone,
    };
  }

  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from("whatsapp_messages")
      .select("id, status, recipient_phone, error_message, retryable")
      .eq("business_id", project.business_id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing) {
      if (existing.status === "failed") {
        await supabase
          .from("whatsapp_messages")
          .update({
            status: "queued",
            error_code: null,
            error_message: null,
            retryable: false,
            provider_message_id: null,
            content,
            recipient_phone: recipientPhone,
            message_type: input.messageType,
            template_name: input.template
              ? resolveProviderTemplateName(input.template)
              : null,
          })
          .eq("id", existing.id);

        return deliverQueuedMessage(existing.id);
      }

      return {
        ok: true,
        messageId: existing.id,
        status: existing.status,
        recipientPhone: existing.recipient_phone,
      };
    }
  }

  const { data: queued, error: insertError } = await supabase
    .from("whatsapp_messages")
    .insert({
      business_id: project.business_id,
      project_id: project.id,
      client_access_id: ctx.access?.id ?? null,
      recipient_phone: recipientPhone,
      message_type: input.messageType,
      template_name: input.template
        ? resolveProviderTemplateName(input.template)
        : null,
      content,
      idempotency_key: idempotencyKey,
      status: "queued",
      sent_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !queued) {
    if (insertError?.code === "23505" && idempotencyKey) {
      const { data: existing } = await supabase
        .from("whatsapp_messages")
        .select("id, status, recipient_phone, error_message")
        .eq("business_id", project.business_id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existing) {
        if (existing.status === "failed") {
          return {
            ok: false,
            error:
              existing.error_message ??
              "We couldn't send this WhatsApp message.",
          };
        }

        return {
          ok: true,
          messageId: existing.id,
          status: existing.status,
          recipientPhone: existing.recipient_phone,
        };
      }
    }

    return { ok: false, error: "We couldn't send this WhatsApp message." };
  }

  return deliverQueuedMessage(queued.id);
}
