import type { WhatsAppTemplateName } from "@/lib/whatsapp/types";

/**
 * Provider template catalog.
 * Meta requires pre-approved template names — do not allow arbitrary editing.
 */
export const WHATSAPP_TEMPLATE_CATALOG: Record<
  WhatsAppTemplateName,
  {
    providerName: string;
    languageCode: string;
    description: string;
  }
> = {
  CLIENT_PORTAL_INVITE: {
    providerName: "client_portal_invite",
    languageCode: "en",
    description: "Share the secure client portal link",
  },
  PROJECT_UPDATE: {
    providerName: "project_update",
    languageCode: "en",
    description: "Share a reviewed project progress update",
  },
  DAILY_SITE_UPDATE: {
    providerName: "daily_site_update",
    languageCode: "en",
    description: "Share a daily site update summary",
  },
  QUOTATION_SHARED: {
    providerName: "quotation_shared",
    languageCode: "en",
    description: "Share a quotation with the client",
  },
};

export function resolveProviderTemplateName(
  template: WhatsAppTemplateName,
): string {
  return WHATSAPP_TEMPLATE_CATALOG[template].providerName;
}

/**
 * Session messages may be sent within an open customer-care window.
 * Outside that window, template messages are required.
 * BuildPilot defaults to session/text for contractor-initiated shares
 * after consent; template mode is available when configured.
 */
export function isTemplateRequired(opts: {
  hasOpenSession?: boolean;
  forceTemplate?: boolean;
}): boolean {
  if (opts.forceTemplate) {
    return true;
  }

  return opts.hasOpenSession === false;
}
