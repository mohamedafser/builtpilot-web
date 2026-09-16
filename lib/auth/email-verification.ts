export const EMAIL_OTP_EXPIRY_SECONDS = 5 * 60;
export const EMAIL_OTP_RESEND_COOLDOWN_SECONDS = 60;
export const EMAIL_OTP_MAX_ATTEMPTS = 5;

export const PENDING_EMAIL_VERIFY_COOKIE = "bp_pending_email_verify";
export const PENDING_PASSWORD_RESET_COOKIE = "bp_pending_password_reset";

export type PendingEmailVerification = {
  email: string;
  userId: string;
  expiresAt: number;
  attempts: number;
  resendAvailableAt: number;
};

export function createPendingEmailVerification(
  email: string,
  userId: string,
  now = Date.now(),
  expiresAt?: number,
): PendingEmailVerification {
  return {
    email: email.trim().toLowerCase(),
    userId,
    expiresAt: expiresAt ?? now + EMAIL_OTP_EXPIRY_SECONDS * 1000,
    attempts: 0,
    resendAvailableAt: now + EMAIL_OTP_RESEND_COOLDOWN_SECONDS * 1000,
  };
}

export function parsePendingEmailVerification(
  raw: string | undefined,
): PendingEmailVerification | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PendingEmailVerification>;
    if (
      typeof parsed.email !== "string" ||
      typeof parsed.userId !== "string" ||
      typeof parsed.expiresAt !== "number" ||
      typeof parsed.attempts !== "number" ||
      typeof parsed.resendAvailableAt !== "number"
    ) {
      return null;
    }

    return {
      email: parsed.email.trim().toLowerCase(),
      userId: parsed.userId,
      expiresAt: parsed.expiresAt,
      attempts: parsed.attempts,
      resendAvailableAt: parsed.resendAvailableAt,
    };
  } catch {
    return null;
  }
}

export function remainingSeconds(expiresAt: number, now = Date.now()) {
  return Math.max(0, Math.ceil((expiresAt - now) / 1000));
}

export function remainingResendSeconds(
  resendAvailableAt: number,
  now = Date.now(),
) {
  return Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));
}
