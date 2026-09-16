import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ORG_TOKEN_VERSION = "v1";

function getInviteSecret() {
  const secret =
    process.env.INVITE_TOKEN_SECRET?.trim() ||
    process.env.OTP_PEPPER?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "buildpilot-invite-dev-secret";

  return createHash("sha256").update(secret).digest();
}

function toBase64Url(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(`${padded}${"=".repeat(padLength)}`, "base64");
}

/** Encrypt organization name for invite signup URLs. */
export function encryptInviteOrganization(organizationName: string): string {
  const plain = organizationName.trim();
  if (!plain) {
    throw new Error("Organization name is required.");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getInviteSecret(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${ORG_TOKEN_VERSION}.${toBase64Url(iv)}.${toBase64Url(tag)}.${toBase64Url(encrypted)}`;
}

/** Decrypt organization name from invite signup URLs. */
export function decryptInviteOrganization(token: string): string | null {
  const value = token.trim();
  if (!value) {
    return null;
  }

  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== ORG_TOKEN_VERSION) {
    return null;
  }

  try {
    const [, ivPart, tagPart, dataPart] = parts;
    const iv = fromBase64Url(ivPart);
    const tag = fromBase64Url(tagPart);
    const encrypted = fromBase64Url(dataPart);
    const decipher = createDecipheriv("aes-256-gcm", getInviteSecret(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    const organization = decrypted.toString("utf8").trim();
    return organization || null;
  } catch {
    return null;
  }
}

export function buildInviteSignupPath(email: string, organizationName: string) {
  const params = new URLSearchParams({
    email: email.trim().toLowerCase(),
    org: encryptInviteOrganization(organizationName),
  });
  return `/signup?${params.toString()}`;
}
