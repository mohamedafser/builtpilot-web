import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { sanitizeOutboundClientMessage } from "@/lib/communication/client-update";
import { sendProjectWhatsAppMessage } from "@/lib/whatsapp/send";

const sendSchema = z.object({
  projectId: z.string().uuid(),
  messageType: z.enum([
    "client_update",
    "portal_link",
    "daily_report",
    "quotation",
    "other",
  ]),
  content: z.string().trim().min(1).max(3500),
  idempotencyKey: z.string().trim().max(120).optional(),
  requireActivePortal: z.boolean().optional(),
  useTemplate: z.boolean().optional(),
  template: z
    .enum([
      "CLIENT_PORTAL_INVITE",
      "PROJECT_UPDATE",
      "DAILY_SITE_UPDATE",
      "QUOTATION_SHARED",
    ])
    .optional(),
  recipientPhone: z.string().trim().max(20).optional(),
});

export async function POST(request: Request) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body.");
  }

  const parsed = sendSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("Invalid WhatsApp send request.");
  }

  const result = await sendProjectWhatsAppMessage({
    ...parsed.data,
    content: sanitizeOutboundClientMessage(parsed.data.content),
  });

  if (!result.ok) {
    return apiError(result.error, result.status ?? 400);
  }

  return apiSuccess("WhatsApp message sent.", {
    id: result.messageId,
    status: result.status,
    recipient_phone: result.recipientPhone,
  });
}
