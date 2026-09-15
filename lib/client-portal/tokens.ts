import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_BYTES = 32;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
export const CLIENT_PORTAL_TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,128}$/;

export function generateClientPortalToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashClientPortalToken(token: string): string {
  return createHash("sha256")
    .update(normalizeClientPortalToken(token), "utf8")
    .digest("hex");
}

export function normalizeClientPortalToken(value: string): string {
  const trimmed = value.trim();

  try {
    return decodeURIComponent(trimmed).trim();
  } catch {
    return trimmed;
  }
}

export function isClientPortalToken(value: string): boolean {
  return CLIENT_PORTAL_TOKEN_PATTERN.test(normalizeClientPortalToken(value));
}

export function isClientPortalTokenHash(value: string): boolean {
  return HASH_PATTERN.test(value);
}

export function verifyClientPortalToken(token: string, hash: string): boolean {
  if (!isClientPortalToken(token) || !isClientPortalTokenHash(hash)) {
    return false;
  }

  const actual = hashClientPortalToken(token);

  try {
    return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}
