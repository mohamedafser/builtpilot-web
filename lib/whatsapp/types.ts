export type WhatsAppMessageType =
  | "client_update"
  | "portal_link"
  | "daily_report"
  | "quotation"
  | "other";

export type WhatsAppMessageStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export type WhatsAppSendMode = "template" | "session";

export type WhatsAppTemplateName =
  | "CLIENT_PORTAL_INVITE"
  | "PROJECT_UPDATE"
  | "DAILY_SITE_UPDATE"
  | "QUOTATION_SHARED";

export type SendTextMessageInput = {
  to: string;
  body: string;
  /** Provider-supported idempotency header when available. */
  idempotencyKey?: string;
};

export type SendTemplateMessageInput = {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: Array<Record<string, unknown>>;
  idempotencyKey?: string;
};

export type SendDocumentMessageInput = {
  to: string;
  link: string;
  caption?: string;
  filename?: string;
  idempotencyKey?: string;
};

export type SendImageMessageInput = {
  to: string;
  link: string;
  caption?: string;
  idempotencyKey?: string;
};

export type WhatsAppSendResult =
  | {
      ok: true;
      providerMessageId: string;
      status: Extract<WhatsAppMessageStatus, "queued" | "sent">;
    }
  | {
      ok: false;
      errorCode: string;
      errorMessage: string;
      retryable: boolean;
    };

export type WhatsAppWebhookVerification = {
  mode: string | null;
  token: string | null;
  challenge: string | null;
};

export type WhatsAppStatusUpdate = {
  providerEventId: string;
  providerMessageId: string;
  status: WhatsAppMessageStatus;
  errorCode?: string | null;
  errorMessage?: string | null;
  timestamp?: string | null;
};

export type WhatsAppWebhookProcessResult = {
  updates: WhatsAppStatusUpdate[];
  ignored: number;
};

export type WhatsAppProvider = {
  readonly name: string;
  sendTextMessage(input: SendTextMessageInput): Promise<WhatsAppSendResult>;
  sendTemplateMessage(
    input: SendTemplateMessageInput,
  ): Promise<WhatsAppSendResult>;
  sendDocumentMessage(
    input: SendDocumentMessageInput,
  ): Promise<WhatsAppSendResult>;
  sendImageMessage(input: SendImageMessageInput): Promise<WhatsAppSendResult>;
  verifyWebhook(input: WhatsAppWebhookVerification): string | null;
  verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string | null,
  ): boolean;
  processWebhook(payload: unknown): WhatsAppWebhookProcessResult;
};

export type WhatsAppMessageRecord = {
  id: string;
  business_id: string;
  project_id: string | null;
  client_access_id: string | null;
  recipient_phone: string;
  message_type: WhatsAppMessageType;
  template_name: string | null;
  content: string | null;
  provider_message_id: string | null;
  idempotency_key: string | null;
  status: WhatsAppMessageStatus;
  error_code: string | null;
  error_message: string | null;
  retryable: boolean;
  sent_by: string;
  created_at: string;
  updated_at: string;
  sent_by_name?: string | null;
};

export type WhatsAppEligibility = {
  canSend: boolean;
  reason: string | null;
  phone: string | null;
  whatsappEnabled: boolean;
  optedIn: boolean;
  portalActive: boolean;
};
