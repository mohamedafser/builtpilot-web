import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_BYTES = 32;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
export const QUOTATION_RESPONSE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,128}$/;

export function generateQuotationResponseToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashQuotationResponseToken(token: string): string {
  return createHash("sha256")
    .update(normalizeQuotationResponseToken(token), "utf8")
    .digest("hex");
}

export function normalizeQuotationResponseToken(value: string): string {
  const trimmed = value.trim();

  try {
    return decodeURIComponent(trimmed).trim();
  } catch {
    return trimmed;
  }
}

export function isQuotationResponseToken(value: string): boolean {
  return QUOTATION_RESPONSE_TOKEN_PATTERN.test(
    normalizeQuotationResponseToken(value),
  );
}

export function isQuotationResponseTokenHash(value: string): boolean {
  return HASH_PATTERN.test(value);
}

export function verifyQuotationResponseToken(
  token: string,
  hash: string,
): boolean {
  if (!isQuotationResponseToken(token) || !isQuotationResponseTokenHash(hash)) {
    return false;
  }

  const actual = hashQuotationResponseToken(token);

  try {
    return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

export function buildQuotationResponseUrl(
  origin: string,
  token: string,
  action?: "accept" | "reject",
): string {
  const base = `${origin.replace(/\/$/, "")}/client/quotation/${encodeURIComponent(token)}`;
  if (!action) {
    return base;
  }

  return `${base}?action=${action}`;
}

export function getAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}
