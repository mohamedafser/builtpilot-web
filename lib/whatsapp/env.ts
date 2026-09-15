/**
 * Server-only WhatsApp provider configuration.
 * Never expose these values with NEXT_PUBLIC_*.
 */

export type WhatsAppProviderName = "meta" | "mock";

export type WhatsAppEnv = {
  provider: WhatsAppProviderName;
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string | null;
  verifyToken: string;
  appSecret: string | null;
  apiVersion: string;
};

export function getWhatsAppEnv(): WhatsAppEnv | null {
  const providerRaw = (process.env.WHATSAPP_PROVIDER ?? "").trim().toLowerCase();
  const provider: WhatsAppProviderName =
    providerRaw === "mock" ? "mock" : providerRaw === "meta" ? "meta" : "meta";

  if (provider === "mock") {
    return {
      provider: "mock",
      accessToken: "mock",
      phoneNumberId: "mock",
      businessAccountId: null,
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN?.trim() || "buildpilot-dev",
      appSecret: process.env.WHATSAPP_APP_SECRET?.trim() || null,
      apiVersion: "v21.0",
    };
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim();

  if (!accessToken || !phoneNumberId || !verifyToken) {
    return null;
  }

  return {
    provider: "meta",
    accessToken,
    phoneNumberId,
    businessAccountId:
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim() || null,
    verifyToken,
    appSecret: process.env.WHATSAPP_APP_SECRET?.trim() || null,
    apiVersion: process.env.WHATSAPP_API_VERSION?.trim() || "v21.0",
  };
}

export function isWhatsAppConfigured(): boolean {
  return getWhatsAppEnv() !== null;
}

/**
 * Verify-token used for Meta's webhook subscription handshake.
 * Independent of send credentials so the callback can be validated
 * before WHATSAPP_ACCESS_TOKEN / PHONE_NUMBER_ID are fully wired.
 */
export function getWhatsAppVerifyToken(): string | null {
  const fromEnv = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const providerRaw = (process.env.WHATSAPP_PROVIDER ?? "").trim().toLowerCase();
  if (providerRaw === "mock") {
    return "buildpilot-dev";
  }

  return null;
}
