/**
 * Phone number normalization and validation for WhatsApp (E.164-ish).
 * Server-side only — do not rely on browser validation alone.
 */

const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export type PhoneValidationResult =
  | { ok: true; e164: string; display: string }
  | { ok: false; error: string };

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Normalize common local formats to E.164.
 * Default region: India (+91) when a 10-digit local mobile is provided.
 */
export function normalizeWhatsAppPhone(
  raw: string,
  defaultCountryCode = "91",
): PhoneValidationResult {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { ok: false, error: "Please enter a valid WhatsApp number." };
  }

  let candidate = trimmed.replace(/[\s()-]/g, "");

  if (candidate.startsWith("00")) {
    candidate = `+${candidate.slice(2)}`;
  }

  if (candidate.startsWith("+")) {
    const e164 = `+${digitsOnly(candidate)}`;
    if (!E164_PATTERN.test(e164)) {
      return { ok: false, error: "Please enter a valid WhatsApp number." };
    }
    return { ok: true, e164, display: formatPhoneDisplay(e164) };
  }

  const digits = digitsOnly(candidate);

  if (digits.length === 10 && defaultCountryCode === "91") {
    const e164 = `+91${digits}`;
    return { ok: true, e164, display: formatPhoneDisplay(e164) };
  }

  if (
    digits.length >= 11 &&
    digits.length <= 15 &&
    digits.startsWith(defaultCountryCode)
  ) {
    const e164 = `+${digits}`;
    if (!E164_PATTERN.test(e164)) {
      return { ok: false, error: "Please enter a valid WhatsApp number." };
    }
    return { ok: true, e164, display: formatPhoneDisplay(e164) };
  }

  if (digits.length >= 8 && digits.length <= 15) {
    const e164 = `+${defaultCountryCode}${digits}`;
    if (!E164_PATTERN.test(e164)) {
      return { ok: false, error: "Please enter a valid WhatsApp number." };
    }
    return { ok: true, e164, display: formatPhoneDisplay(e164) };
  }

  return { ok: false, error: "Please enter a valid WhatsApp number." };
}

export function formatPhoneDisplay(e164: string): string {
  if (e164.startsWith("+91") && e164.length === 13) {
    return `+91 ${e164.slice(3, 8)} ${e164.slice(8)}`;
  }

  return e164;
}

export function maskPhone(e164: string): string {
  if (e164.length < 8) {
    return e164;
  }

  return `${e164.slice(0, 4)} XXXXX ${e164.slice(-4)}`;
}

export function isValidWhatsAppPhone(raw: string): boolean {
  return normalizeWhatsAppPhone(raw).ok;
}
