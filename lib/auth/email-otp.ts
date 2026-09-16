import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import {
  EMAIL_OTP_EXPIRY_SECONDS,
  EMAIL_OTP_MAX_ATTEMPTS,
} from "@/lib/auth/email-verification";
import { buildPasswordResetEmailTemplate } from "@/lib/auth/password-reset-email-template";
import { buildSignupEmailTemplate } from "@/lib/auth/signup-email-template";
import { sendEmail } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";

export type EmailOtpPurpose = "signup" | "password_reset";

function requireAdmin() {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for email verification.",
    );
  }
  return admin;
}

function hashOtp(code: string, userId: string, purpose: EmailOtpPurpose) {
  const pepper =
    process.env.OTP_PEPPER?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "buildpilot-otp";
  return createHash("sha256")
    .update(`${purpose}:${userId}:${code}:${pepper}`)
    .digest("hex");
}

function secureCompareHex(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function generateNumericOtp() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function findAuthUserByEmail(email: string) {
  const admin = requireAdmin();
  const normalized = email.trim().toLowerCase();

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      return { user: null, error };
    }

    const user = data.users.find(
      (entry) => entry.email?.trim().toLowerCase() === normalized,
    );
    if (user) {
      return { user, error: null };
    }

    if (data.users.length < 200) {
      break;
    }
  }

  return { user: null, error: null };
}

export async function invalidateActiveOtps(
  userId: string,
  purpose?: EmailOtpPurpose,
) {
  const admin = requireAdmin();
  const now = new Date().toISOString();

  let query = admin
    .from("email_otps")
    .update({ consumed_at: now })
    .eq("user_id", userId)
    .is("consumed_at", null);

  if (purpose) {
    query = query.eq("purpose", purpose);
  }

  await query;
}

export async function issueAndSendEmailOtp({
  userId,
  email,
  firstName,
  purpose = "signup",
}: {
  userId: string;
  email: string;
  firstName?: string | null;
  purpose?: EmailOtpPurpose;
}): Promise<
  | { ok: true; expiresAt: number }
  | { ok: false; error: string; rateLimited?: boolean }
> {
  const admin = requireAdmin();
  const normalizedEmail = email.trim().toLowerCase();
  const code = generateNumericOtp();
  const expiresAtMs = Date.now() + EMAIL_OTP_EXPIRY_SECONDS * 1000;
  const expiresAt = new Date(expiresAtMs).toISOString();

  await invalidateActiveOtps(userId, purpose);

  const { error: insertError } = await admin.from("email_otps").insert({
    user_id: userId,
    email: normalizedEmail,
    code_hash: hashOtp(code, userId, purpose),
    expires_at: expiresAt,
    attempts: 0,
    purpose,
  });

  if (insertError) {
    console.error("[auth:email-otp:insert]", insertError.message);
    return {
      ok: false,
      error: "Unable to create a verification code. Please try again.",
    };
  }

  const template =
    purpose === "password_reset"
      ? buildPasswordResetEmailTemplate({
          firstName: firstName?.trim() || "there",
          otp: code,
        })
      : buildSignupEmailTemplate({
          firstName: firstName?.trim() || "there",
          otp: code,
        });

  const sent = await sendEmail({
    to: normalizedEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  if (!sent.ok) {
    console.error("[auth:email-otp:send]", sent.error);
    await invalidateActiveOtps(userId, purpose);
    return {
      ok: false,
      error:
        sent.error.includes("not configured")
          ? "Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS."
          : "Unable to send the verification email. Please try again.",
    };
  }

  return { ok: true, expiresAt: expiresAtMs };
}

export async function verifyEmailOtpCode({
  userId,
  email,
  token,
  purpose = "signup",
}: {
  userId: string;
  email: string;
  token: string;
  purpose?: EmailOtpPurpose;
}): Promise<
  | { ok: true }
  | {
      ok: false;
      reason: "invalid" | "expired" | "locked" | "missing";
      message: string;
    }
> {
  const admin = requireAdmin();
  const normalizedEmail = email.trim().toLowerCase();

  const { data: rows, error } = await admin
    .from("email_otps")
    .select("id, code_hash, expires_at, attempts")
    .eq("user_id", userId)
    .eq("email", normalizedEmail)
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[auth:email-otp:lookup]", error.message);
    return {
      ok: false,
      reason: "missing",
      message: "Unable to verify your email. Please try again.",
    };
  }

  const row = rows?.[0];
  if (!row) {
    return {
      ok: false,
      reason: "missing",
      message: "No active verification code. Please request a new code.",
    };
  }

  if (row.attempts >= EMAIL_OTP_MAX_ATTEMPTS) {
    return {
      ok: false,
      reason: "locked",
      message:
        "Too many incorrect attempts. Please request a new verification code.",
    };
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await admin
      .from("email_otps")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);
    return {
      ok: false,
      reason: "expired",
      message:
        "Your verification code has expired. Please request a new code.",
    };
  }

  const expected = hashOtp(token, userId, purpose);
  if (!secureCompareHex(expected, row.code_hash)) {
    const nextAttempts = row.attempts + 1;
    await admin
      .from("email_otps")
      .update({ attempts: nextAttempts })
      .eq("id", row.id);

    if (nextAttempts >= EMAIL_OTP_MAX_ATTEMPTS) {
      return {
        ok: false,
        reason: "locked",
        message:
          "Too many incorrect attempts. Please request a new verification code.",
      };
    }

    return {
      ok: false,
      reason: "invalid",
      message: "Invalid verification code. Please try again.",
    };
  }

  await admin
    .from("email_otps")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id);

  return { ok: true };
}

export async function confirmUserEmail(userId: string) {
  const admin = requireAdmin();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });
  return { error };
}

export async function createSessionForEmail(
  email: string,
  type: "magiclink" | "recovery" = "magiclink",
) {
  const admin = requireAdmin();
  const { data, error } = await admin.auth.admin.generateLink({
    type,
    email,
  });

  if (error || !data.properties?.hashed_token) {
    return { error: error ?? new Error("Unable to create session.") };
  }

  return {
    error: null,
    tokenHash: data.properties.hashed_token as string,
  };
}
