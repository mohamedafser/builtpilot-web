import { createHmac, timingSafeEqual } from "crypto";
import { getWhatsAppEnv } from "@/lib/whatsapp/env";
import type {
  SendDocumentMessageInput,
  SendImageMessageInput,
  SendTemplateMessageInput,
  SendTextMessageInput,
  WhatsAppProvider,
  WhatsAppSendResult,
  WhatsAppStatusUpdate,
  WhatsAppWebhookProcessResult,
  WhatsAppWebhookVerification,
} from "@/lib/whatsapp/types";

function classifyMetaError(code: number | string | undefined, message: string) {
  const normalized = String(code ?? "");
  const permanentCodes = new Set([
    "100",
    "131026",
    "131030",
    "131047",
    "131051",
    "132000",
    "132001",
    "132005",
    "132007",
    "132012",
    "132015",
    "133010",
  ]);

  if (permanentCodes.has(normalized)) {
    return { retryable: false, errorCode: normalized || "permanent_failure" };
  }

  if (
    message.toLowerCase().includes("blocked") ||
    message.toLowerCase().includes("not a valid") ||
    message.toLowerCase().includes("template") ||
    message.toLowerCase().includes("allowed list")
  ) {
    return { retryable: false, errorCode: normalized || "permanent_failure" };
  }

  return { retryable: true, errorCode: normalized || "temporary_failure" };
}

function safeProviderError(
  message: string,
  code?: number | string | undefined,
): string {
  const normalized = String(code ?? "");
  const lowered = message.toLowerCase();

  if (
    normalized === "131030" ||
    lowered.includes("allowed list") ||
    lowered.includes("not in allowed")
  ) {
    return "This phone number is not on your WhatsApp test recipient list. Add it in Meta Developer Console (WhatsApp > API Setup > To), or move the app out of development mode.";
  }

  if (lowered.includes("invalid") && lowered.includes("phone")) {
    return "Please enter a valid WhatsApp number.";
  }

  if (lowered.includes("template")) {
    return "This WhatsApp template was rejected. Please try a session message or another template.";
  }

  if (lowered.includes("blocked")) {
    return "This recipient has blocked WhatsApp messages from your business.";
  }

  if (
    normalized === "131047" ||
    lowered.includes("re-engagement") ||
    (lowered.includes("24 hour") && lowered.includes("window"))
  ) {
    return "The 24-hour WhatsApp session has expired. Send an approved template message, or ask the client to message you first.";
  }

  if (lowered.includes("oauth") || lowered.includes("access token")) {
    return "WhatsApp is temporarily unavailable. Please try again.";
  }

  return "We couldn't send this WhatsApp message.";
}

function mockProvider(): WhatsAppProvider {
  return {
    name: "mock",
    async sendTextMessage(input) {
      return {
        ok: true,
        providerMessageId: `mock_${Date.now()}_${input.to.slice(-4)}`,
        status: "sent",
      };
    },
    async sendTemplateMessage(input) {
      return {
        ok: true,
        providerMessageId: `mock_tpl_${Date.now()}_${input.to.slice(-4)}`,
        status: "sent",
      };
    },
    async sendDocumentMessage(input) {
      return {
        ok: true,
        providerMessageId: `mock_doc_${Date.now()}_${input.to.slice(-4)}`,
        status: "sent",
      };
    },
    async sendImageMessage(input) {
      return {
        ok: true,
        providerMessageId: `mock_img_${Date.now()}_${input.to.slice(-4)}`,
        status: "sent",
      };
    },
    verifyWebhook(input) {
      const env = getWhatsAppEnv();
      if (
        input.mode === "subscribe" &&
        input.token &&
        env &&
        input.token === env.verifyToken
      ) {
        return input.challenge;
      }
      return null;
    },
    verifyWebhookSignature() {
      return true;
    },
    processWebhook(payload) {
      return processMetaStyleWebhook(payload);
    },
  };
}

async function metaGraphSend(
  path: string,
  body: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<WhatsAppSendResult> {
  const env = getWhatsAppEnv();

  if (!env || env.provider !== "meta") {
    return {
      ok: false,
      errorCode: "not_configured",
      errorMessage: "WhatsApp is temporarily unavailable. Please try again.",
      retryable: true,
    };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.accessToken}`,
    "Content-Type": "application/json",
  };

  if (idempotencyKey) {
    headers["X-Idempotency-Key"] = idempotencyKey.slice(0, 64);
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${env.apiVersion}/${env.phoneNumberId}${path}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      },
    );

    const json = (await response.json().catch(() => null)) as {
      messages?: Array<{ id?: string }>;
      error?: { code?: number; message?: string; error_subcode?: number };
    } | null;

    if (!response.ok || json?.error) {
      const message = json?.error?.message ?? "Provider request failed";
      const code = json?.error?.code;
      const classified = classifyMetaError(code, message);
      return {
        ok: false,
        errorCode: classified.errorCode,
        errorMessage: safeProviderError(message, code),
        retryable: classified.retryable,
      };
    }

    const providerMessageId = json?.messages?.[0]?.id;

    if (!providerMessageId) {
      return {
        ok: false,
        errorCode: "missing_message_id",
        errorMessage: "We couldn't send this WhatsApp message.",
        retryable: true,
      };
    }

    return {
      ok: true,
      providerMessageId,
      status: "sent",
    };
  } catch {
    return {
      ok: false,
      errorCode: "network_error",
      errorMessage: "WhatsApp is temporarily unavailable. Please try again.",
      retryable: true,
    };
  }
}

function metaProvider(): WhatsAppProvider {
  const env = getWhatsAppEnv();

  return {
    name: "meta",
    async sendTextMessage(input: SendTextMessageInput) {
      return metaGraphSend(
        "/messages",
        {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: input.to.replace(/^\+/, ""),
          type: "text",
          text: { preview_url: false, body: input.body },
        },
        input.idempotencyKey,
      );
    },
    async sendTemplateMessage(input: SendTemplateMessageInput) {
      return metaGraphSend(
        "/messages",
        {
          messaging_product: "whatsapp",
          to: input.to.replace(/^\+/, ""),
          type: "template",
          template: {
            name: input.templateName,
            language: { code: input.languageCode ?? "en" },
            components: input.components ?? [],
          },
        },
        input.idempotencyKey,
      );
    },
    async sendDocumentMessage(input: SendDocumentMessageInput) {
      return metaGraphSend(
        "/messages",
        {
          messaging_product: "whatsapp",
          to: input.to.replace(/^\+/, ""),
          type: "document",
          document: {
            link: input.link,
            caption: input.caption,
            filename: input.filename,
          },
        },
        input.idempotencyKey,
      );
    },
    async sendImageMessage(input: SendImageMessageInput) {
      return metaGraphSend(
        "/messages",
        {
          messaging_product: "whatsapp",
          to: input.to.replace(/^\+/, ""),
          type: "image",
          image: {
            link: input.link,
            caption: input.caption,
          },
        },
        input.idempotencyKey,
      );
    },
    verifyWebhook(input: WhatsAppWebhookVerification) {
      if (!env) {
        return null;
      }

      if (
        input.mode === "subscribe" &&
        input.token &&
        input.token === env.verifyToken &&
        input.challenge
      ) {
        return input.challenge;
      }

      return null;
    },
    verifyWebhookSignature(rawBody, signatureHeader) {
      if (!env?.appSecret) {
        // Reject when secret is configured expectation; if unset in prod, fail closed.
        return false;
      }

      if (!signatureHeader?.startsWith("sha256=")) {
        return false;
      }

      const expected = createHmac("sha256", env.appSecret)
        .update(rawBody, "utf8")
        .digest("hex");
      const provided = signatureHeader.slice("sha256=".length);

      try {
        const a = Buffer.from(expected, "utf8");
        const b = Buffer.from(provided, "utf8");
        return a.length === b.length && timingSafeEqual(a, b);
      } catch {
        return false;
      }
    },
    processWebhook(payload) {
      return processMetaStyleWebhook(payload);
    },
  };
}

function mapMetaStatus(
  status: string,
): WhatsAppStatusUpdate["status"] | null {
  switch (status) {
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "read":
      return "read";
    case "failed":
      return "failed";
    default:
      return null;
  }
}

function processMetaStyleWebhook(payload: unknown): WhatsAppWebhookProcessResult {
  const updates: WhatsAppStatusUpdate[] = [];
  let ignored = 0;

  if (!payload || typeof payload !== "object") {
    return { updates, ignored: 1 };
  }

  const root = payload as {
    entry?: Array<{
      id?: string;
      changes?: Array<{
        value?: {
          statuses?: Array<{
            id?: string;
            status?: string;
            timestamp?: string;
            errors?: Array<{ code?: number; title?: string; message?: string }>;
          }>;
        };
      }>;
    }>;
  };

  for (const entry of root.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const status of change.value?.statuses ?? []) {
        const mapped = status.status ? mapMetaStatus(status.status) : null;
        if (!status.id || !mapped) {
          ignored += 1;
          continue;
        }

        const err = status.errors?.[0];
        updates.push({
          providerEventId: `${status.id}:${mapped}:${status.timestamp ?? ""}`,
          providerMessageId: status.id,
          status: mapped,
          errorCode: err?.code != null ? String(err.code) : null,
          errorMessage: err?.title || err?.message || null,
          timestamp: status.timestamp ?? null,
        });
      }
    }
  }

  return { updates, ignored };
}

export function getWhatsAppProvider(): WhatsAppProvider | null {
  const env = getWhatsAppEnv();

  if (!env) {
    return null;
  }

  if (env.provider === "mock") {
    return mockProvider();
  }

  return metaProvider();
}
