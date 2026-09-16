import {
  AUTH_MESSAGES,
  PASSWORD_RECOVERY_COOKIE,
  PASSWORD_RECOVERY_MAX_AGE,
} from "@/lib/auth/constants";
import {
  clearPendingEmailVerification,
  readPendingEmailVerification,
  writePendingEmailVerification,
} from "@/lib/auth/email-verification-cookie";
import {
  confirmUserEmail,
  createSessionForEmail,
  findAuthUserByEmail,
  issueAndSendEmailOtp,
  verifyEmailOtpCode,
} from "@/lib/auth/email-otp";
import {
  createPendingEmailVerification,
  EMAIL_OTP_MAX_ATTEMPTS,
  remainingResendSeconds,
  remainingSeconds,
  type PendingEmailVerification,
} from "@/lib/auth/email-verification";
import {
  clearPendingPasswordReset,
  readPendingPasswordReset,
  writePendingPasswordReset,
} from "@/lib/auth/password-reset-cookie";
import { getAuthErrorMessage, logAuthError } from "@/lib/auth/errors";
import { resolveAuthOrigin } from "@/lib/app-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  resendPasswordResetSchema,
  resendSignupSchema,
  resetPasswordSchema,
  signupSchema,
  verifyPasswordResetOtpSchema,
  verifySignupOtpSchema,
} from "@/lib/validations/auth";
import { getZodErrorMessage } from "@/lib/validations/error";
import { cookies } from "next/headers";

export { resolveAuthOrigin };

export type AuthServiceError = {
  ok: false;
  message: string;
  status: number;
  retryAfterSeconds?: number;
};

export type AuthServiceSuccess<T> = {
  ok: true;
  message: string;
  data: T;
};

export type AuthServiceResult<T> = AuthServiceSuccess<T> | AuthServiceError;

export type EmailVerificationPayload = {
  email: string;
  expiresAt: number;
  retryAfterSeconds: number;
  redirectTo?: string;
  needsVerification?: boolean;
};

function fail(
  message: string,
  status = 400,
  retryAfterSeconds?: number,
): AuthServiceError {
  return { ok: false, message, status, retryAfterSeconds };
}

function ok<T>(message: string, data: T): AuthServiceSuccess<T> {
  return { ok: true, message, data };
}

export function safeNextPath(nextPath?: string | null) {
  return nextPath && nextPath.startsWith("/") ? nextPath : "/dashboard";
}

function isEmailNotConfirmedError(error: {
  message: string;
  code?: string;
}) {
  const message = error.message.toLowerCase();
  const code = error.code?.toLowerCase() ?? "";
  return (
    code === "email_not_confirmed" || message.includes("email not confirmed")
  );
}

function authStatusForMessage(message: string, flow: "login" | "signup") {
  if (
    message === AUTH_MESSAGES.rateLimited ||
    message === AUTH_MESSAGES.emailSendRateLimited
  ) {
    return 429;
  }
  if (flow === "signup" && message === AUTH_MESSAGES.signupDuplicate) {
    return 409;
  }
  if (flow === "login" && message === AUTH_MESSAGES.loginInvalid) {
    return 401;
  }
  return 400;
}

function verificationPayload(
  pending: PendingEmailVerification,
  extras?: Partial<EmailVerificationPayload>,
): EmailVerificationPayload {
  return {
    email: pending.email,
    expiresAt: pending.expiresAt,
    retryAfterSeconds: remainingResendSeconds(pending.resendAvailableAt),
    ...extras,
  };
}

async function beginEmailVerification(
  email: string,
  userId: string,
  expiresAt?: number,
): Promise<PendingEmailVerification> {
  const pending = createPendingEmailVerification(
    email,
    userId,
    Date.now(),
    expiresAt,
  );
  await writePendingEmailVerification(pending);
  return pending;
}

async function beginPasswordReset(
  email: string,
  userId: string,
  expiresAt?: number,
): Promise<PendingEmailVerification> {
  const pending = createPendingEmailVerification(
    email,
    userId,
    Date.now(),
    expiresAt,
  );
  await writePendingPasswordReset(pending);
  return pending;
}

async function setPasswordRecoveryCookie() {
  const cookieStore = await cookies();
  cookieStore.set(PASSWORD_RECOVERY_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: PASSWORD_RECOVERY_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

function requireAdminOrFail() {
  const admin = createAdminClient();
  if (!admin) {
    return null;
  }
  return admin;
}

export async function getEmailVerificationSession(): Promise<
  AuthServiceResult<EmailVerificationPayload>
> {
  const pending = await readPendingEmailVerification();

  if (!pending) {
    return fail(AUTH_MESSAGES.verifyOtpMissingSession, 401);
  }

  return ok("Verification session ready.", verificationPayload(pending));
}

export async function getPasswordResetSession(): Promise<
  AuthServiceResult<EmailVerificationPayload>
> {
  const pending = await readPendingPasswordReset();

  if (!pending) {
    return fail(AUTH_MESSAGES.forgotPasswordMissingSession, 401);
  }

  return ok("Password reset session ready.", verificationPayload(pending));
}

export async function performLogin(
  values: unknown,
  nextPath?: string | null,
  _origin?: string,
): Promise<
  AuthServiceResult<{ redirectTo: string } | EmailVerificationPayload>
> {
  const parsed = loginSchema.safeParse(values);

  if (!parsed.success) {
    return fail(getZodErrorMessage(parsed.error, "Invalid login details."));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (isEmailNotConfirmedError(error)) {
      return startVerificationForUnconfirmedLogin(parsed.data.email);
    }

    logAuthError("login", error);
    const message = getAuthErrorMessage(error, "login");
    return fail(message, authStatusForMessage(message, "login"));
  }

  await clearPendingEmailVerification();

  return ok("Signed in successfully.", {
    redirectTo: safeNextPath(nextPath),
  });
}

async function startVerificationForUnconfirmedLogin(
  email: string,
): Promise<AuthServiceResult<EmailVerificationPayload>> {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await readPendingEmailVerification();
  const now = Date.now();

  if (
    existing &&
    existing.email === normalizedEmail &&
    existing.expiresAt > now
  ) {
    return ok(AUTH_MESSAGES.loginUnconfirmed, {
      ...verificationPayload(existing),
      needsVerification: true,
      redirectTo: "/verify-email",
    });
  }

  if (
    existing &&
    existing.email === normalizedEmail &&
    remainingResendSeconds(existing.resendAvailableAt, now) > 0
  ) {
    return ok(AUTH_MESSAGES.loginUnconfirmed, {
      ...verificationPayload(existing),
      needsVerification: true,
      redirectTo: "/verify-email",
    });
  }

  const resend = await performResendSignupEmail({ email });
  if (resend.ok) {
    return ok(AUTH_MESSAGES.loginUnconfirmed, {
      ...resend.data,
      needsVerification: true,
      redirectTo: "/verify-email",
    });
  }

  const pending = await readPendingEmailVerification();
  if (pending && pending.email === normalizedEmail) {
    return ok(AUTH_MESSAGES.loginUnconfirmed, {
      ...verificationPayload(pending),
      needsVerification: true,
      redirectTo: "/verify-email",
    });
  }

  return fail(resend.message, resend.status, resend.retryAfterSeconds);
}

export async function performSignup(
  values: unknown,
  _origin?: string,
): Promise<
  AuthServiceResult<
    EmailVerificationPayload & {
      redirectTo?: string;
    }
  >
> {
  const parsed = signupSchema.safeParse(values);

  if (!parsed.success) {
    return fail(getZodErrorMessage(parsed.error, "Invalid signup details."));
  }

  const admin = requireAdminOrFail();
  if (!admin) {
    return fail(
      "Server email verification is not configured. Set SUPABASE_SERVICE_ROLE_KEY.",
      500,
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await findAuthUserByEmail(email);
  if (existing.error) {
    logAuthError("signup-lookup", existing.error);
    return fail(AUTH_MESSAGES.signupFailed);
  }

  if (existing.user) {
    if (existing.user.email_confirmed_at) {
      return fail(AUTH_MESSAGES.signupDuplicate, 409);
    }

    await admin.auth.admin.updateUserById(existing.user.id, {
      password: parsed.data.password,
      user_metadata: {
        full_name: parsed.data.full_name,
        business_name: parsed.data.business_name,
        country_code: parsed.data.country_code,
        language: parsed.data.language,
      },
    });

    const issued = await issueAndSendEmailOtp({
      userId: existing.user.id,
      email,
      firstName: parsed.data.full_name,
    });

    if (!issued.ok) {
      return fail(issued.error, 500);
    }

    const pending = await beginEmailVerification(
      email,
      existing.user.id,
      issued.expiresAt,
    );

    return ok(AUTH_MESSAGES.signupSuccess, {
      ...verificationPayload(pending),
      redirectTo: "/verify-email",
    });
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: false,
    user_metadata: {
      full_name: parsed.data.full_name,
      business_name: parsed.data.business_name,
      country_code: parsed.data.country_code,
      language: parsed.data.language,
    },
  });

  if (error || !data.user) {
    logAuthError("signup", error ?? { message: "Missing user after create." });
    const message = error
      ? getAuthErrorMessage(error, "signup")
      : AUTH_MESSAGES.signupFailed;
    return fail(message, authStatusForMessage(message, "signup"));
  }

  const issued = await issueAndSendEmailOtp({
    userId: data.user.id,
    email,
    firstName: parsed.data.full_name,
  });

  if (!issued.ok) {
    await admin.auth.admin.deleteUser(data.user.id);
    return fail(issued.error, 500);
  }

  const pending = await beginEmailVerification(
    email,
    data.user.id,
    issued.expiresAt,
  );

  return ok(AUTH_MESSAGES.signupSuccess, {
    ...verificationPayload(pending),
    redirectTo: "/verify-email",
  });
}

export async function performResendSignupEmail(
  values: unknown,
  _origin?: string,
): Promise<AuthServiceResult<EmailVerificationPayload>> {
  const parsed = resendSignupSchema.safeParse(values);

  if (!parsed.success) {
    return fail(
      getZodErrorMessage(parsed.error, "Enter a valid email address."),
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existingPending = await readPendingEmailVerification();
  const now = Date.now();

  if (existingPending && existingPending.email === email) {
    const wait = remainingResendSeconds(existingPending.resendAvailableAt, now);
    if (wait > 0) {
      return fail(AUTH_MESSAGES.rateLimited, 429, wait);
    }
  }

  const admin = requireAdminOrFail();
  if (!admin) {
    return fail(
      "Server email verification is not configured. Set SUPABASE_SERVICE_ROLE_KEY.",
      500,
    );
  }

  let userId = existingPending?.email === email ? existingPending.userId : null;
  let firstName: string | null = null;

  if (!userId) {
    const found = await findAuthUserByEmail(email);
    if (found.error) {
      logAuthError("signup-resend-lookup", found.error);
      return fail(AUTH_MESSAGES.signupResendFailed);
    }
    if (!found.user) {
      return fail(AUTH_MESSAGES.verifyOtpMissingSession, 404);
    }
    if (found.user.email_confirmed_at) {
      return fail(AUTH_MESSAGES.signupDuplicate, 409);
    }
    userId = found.user.id;
    firstName =
      typeof found.user.user_metadata?.full_name === "string"
        ? found.user.user_metadata.full_name
        : null;
  }

  const issued = await issueAndSendEmailOtp({
    userId,
    email,
    firstName,
  });

  if (!issued.ok) {
    return fail(
      issued.error,
      issued.error.toLowerCase().includes("not configured") ? 500 : 400,
    );
  }

  const pending = await beginEmailVerification(email, userId, issued.expiresAt);
  return ok(AUTH_MESSAGES.signupResendSuccess, verificationPayload(pending));
}

export async function performVerifySignupOtp(
  values: unknown,
): Promise<AuthServiceResult<{ redirectTo: string }>> {
  const parsed = verifySignupOtpSchema.safeParse(values);

  if (!parsed.success) {
    return fail(
      getZodErrorMessage(parsed.error, "Enter the 6-digit verification code."),
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const pending = await readPendingEmailVerification();

  if (!pending || pending.email !== email) {
    return fail(AUTH_MESSAGES.verifyOtpMissingSession, 401);
  }

  if (pending.attempts >= EMAIL_OTP_MAX_ATTEMPTS) {
    return fail(AUTH_MESSAGES.verifyOtpLocked, 429);
  }

  if (remainingSeconds(pending.expiresAt) <= 0) {
    return fail(AUTH_MESSAGES.verifyOtpExpired, 400);
  }

  const verified = await verifyEmailOtpCode({
    userId: pending.userId,
    email,
    token: parsed.data.token,
  });

  if (!verified.ok) {
    const nextPending: PendingEmailVerification = {
      ...pending,
      attempts: pending.attempts + 1,
    };
    await writePendingEmailVerification(nextPending);

    if (verified.reason === "expired") {
      return fail(AUTH_MESSAGES.verifyOtpExpired, 400);
    }
    if (verified.reason === "locked") {
      return fail(AUTH_MESSAGES.verifyOtpLocked, 429);
    }
    if (nextPending.attempts >= EMAIL_OTP_MAX_ATTEMPTS) {
      return fail(AUTH_MESSAGES.verifyOtpLocked, 429);
    }
    return fail(verified.message || AUTH_MESSAGES.verifyOtpInvalid, 400);
  }

  const { error: confirmError } = await confirmUserEmail(pending.userId);
  if (confirmError) {
    logAuthError("confirm-email", confirmError);
    return fail(AUTH_MESSAGES.verifyOtpFailed);
  }

  const sessionLink = await createSessionForEmail(email);
  if (sessionLink.error || !sessionLink.tokenHash) {
    logAuthError(
      "create-session",
      sessionLink.error ?? { message: "Missing session token." },
    );
    await clearPendingEmailVerification();
    return ok(AUTH_MESSAGES.verifyOtpSuccess, {
      redirectTo: "/login?verified=1",
    });
  }

  const supabase = await createClient();
  const { error: sessionError } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: sessionLink.tokenHash,
  });

  await clearPendingEmailVerification();

  if (sessionError) {
    logAuthError("verify-session", sessionError);
    return ok(AUTH_MESSAGES.verifyOtpSuccess, {
      redirectTo: "/login?verified=1",
    });
  }

  return ok(AUTH_MESSAGES.verifyOtpSuccess, {
    redirectTo: "/dashboard",
  });
}

export async function performForgotPassword(
  values: unknown,
  _origin?: string,
): Promise<
  AuthServiceResult<
    EmailVerificationPayload & {
      redirectTo?: string;
    }
  >
> {
  const parsed = forgotPasswordSchema.safeParse(values);

  if (!parsed.success) {
    return fail(
      getZodErrorMessage(parsed.error, "Enter a valid email address."),
    );
  }

  const admin = requireAdminOrFail();
  if (!admin) {
    return fail(
      "Server email verification is not configured. Set SUPABASE_SERVICE_ROLE_KEY.",
      500,
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const found = await findAuthUserByEmail(email);

  if (found.error) {
    logAuthError("forgot-password-lookup", found.error);
    return fail(AUTH_MESSAGES.forgotPasswordFailed);
  }

  // Avoid revealing whether the email exists.
  if (!found.user) {
    return ok(AUTH_MESSAGES.forgotPasswordSuccess, {
      email,
      expiresAt: Date.now() + 5 * 60 * 1000,
      retryAfterSeconds: 60,
    });
  }

  const firstName =
    typeof found.user.user_metadata?.full_name === "string"
      ? found.user.user_metadata.full_name
      : null;

  const issued = await issueAndSendEmailOtp({
    userId: found.user.id,
    email,
    firstName,
    purpose: "password_reset",
  });

  if (!issued.ok) {
    return fail(
      issued.error,
      issued.error.toLowerCase().includes("not configured") ? 500 : 400,
    );
  }

  const pending = await beginPasswordReset(
    email,
    found.user.id,
    issued.expiresAt,
  );

  return ok(AUTH_MESSAGES.forgotPasswordCodeSent, {
    ...verificationPayload(pending),
    redirectTo: "/verify-reset",
  });
}

export async function performResendPasswordResetEmail(
  values: unknown,
): Promise<AuthServiceResult<EmailVerificationPayload>> {
  const parsed = resendPasswordResetSchema.safeParse(values);

  if (!parsed.success) {
    return fail(
      getZodErrorMessage(parsed.error, "Enter a valid email address."),
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existingPending = await readPendingPasswordReset();
  const now = Date.now();

  if (existingPending && existingPending.email === email) {
    const wait = remainingResendSeconds(existingPending.resendAvailableAt, now);
    if (wait > 0) {
      return fail(AUTH_MESSAGES.rateLimited, 429, wait);
    }
  }

  const admin = requireAdminOrFail();
  if (!admin) {
    return fail(
      "Server email verification is not configured. Set SUPABASE_SERVICE_ROLE_KEY.",
      500,
    );
  }

  let userId =
    existingPending?.email === email ? existingPending.userId : null;
  let firstName: string | null = null;

  if (!userId) {
    const found = await findAuthUserByEmail(email);
    if (found.error) {
      logAuthError("password-reset-resend-lookup", found.error);
      return fail(AUTH_MESSAGES.forgotPasswordFailed);
    }
    if (!found.user) {
      return fail(AUTH_MESSAGES.forgotPasswordMissingSession, 404);
    }
    userId = found.user.id;
    firstName =
      typeof found.user.user_metadata?.full_name === "string"
        ? found.user.user_metadata.full_name
        : null;
  }

  const issued = await issueAndSendEmailOtp({
    userId,
    email,
    firstName,
    purpose: "password_reset",
  });

  if (!issued.ok) {
    return fail(
      issued.error,
      issued.error.toLowerCase().includes("not configured") ? 500 : 400,
    );
  }

  const pending = await beginPasswordReset(email, userId, issued.expiresAt);
  return ok(
    AUTH_MESSAGES.forgotPasswordResendSuccess,
    verificationPayload(pending),
  );
}

export async function performVerifyPasswordResetOtp(
  values: unknown,
): Promise<AuthServiceResult<{ redirectTo: string }>> {
  const parsed = verifyPasswordResetOtpSchema.safeParse(values);

  if (!parsed.success) {
    return fail(
      getZodErrorMessage(parsed.error, "Enter the 6-digit verification code."),
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const pending = await readPendingPasswordReset();

  if (!pending || pending.email !== email) {
    return fail(AUTH_MESSAGES.forgotPasswordMissingSession, 401);
  }

  if (pending.attempts >= EMAIL_OTP_MAX_ATTEMPTS) {
    return fail(AUTH_MESSAGES.verifyOtpLocked, 429);
  }

  if (remainingSeconds(pending.expiresAt) <= 0) {
    return fail(AUTH_MESSAGES.verifyOtpExpired, 400);
  }

  const verified = await verifyEmailOtpCode({
    userId: pending.userId,
    email,
    token: parsed.data.token,
    purpose: "password_reset",
  });

  if (!verified.ok) {
    const nextPending: PendingEmailVerification = {
      ...pending,
      attempts: pending.attempts + 1,
    };
    await writePendingPasswordReset(nextPending);

    if (verified.reason === "expired") {
      return fail(AUTH_MESSAGES.verifyOtpExpired, 400);
    }
    if (verified.reason === "locked") {
      return fail(AUTH_MESSAGES.verifyOtpLocked, 429);
    }
    if (nextPending.attempts >= EMAIL_OTP_MAX_ATTEMPTS) {
      return fail(AUTH_MESSAGES.verifyOtpLocked, 429);
    }
    return fail(verified.message || AUTH_MESSAGES.verifyOtpInvalid, 400);
  }

  const sessionLink = await createSessionForEmail(email, "recovery");
  if (sessionLink.error || !sessionLink.tokenHash) {
    logAuthError(
      "create-recovery-session",
      sessionLink.error ?? { message: "Missing recovery token." },
    );
    await clearPendingPasswordReset();
    return fail(AUTH_MESSAGES.verifyOtpFailed);
  }

  const supabase = await createClient();
  const { error: sessionError } = await supabase.auth.verifyOtp({
    type: "recovery",
    token_hash: sessionLink.tokenHash,
  });

  await clearPendingPasswordReset();

  if (sessionError) {
    logAuthError("verify-recovery-session", sessionError);
    return fail(AUTH_MESSAGES.verifyOtpFailed);
  }

  await setPasswordRecoveryCookie();

  return ok("Code verified. Choose a new password.", {
    redirectTo: "/reset-password",
  });
}

export async function performResetPassword(
  values: unknown,
): Promise<AuthServiceResult<{ redirectTo: string }>> {
  const parsed = resetPasswordSchema.safeParse(values);

  if (!parsed.success) {
    return fail(getZodErrorMessage(parsed.error, "Invalid password details."));
  }

  const cookieStore = await cookies();
  const hasRecoverySession = cookieStore.get(PASSWORD_RECOVERY_COOKIE);

  if (!hasRecoverySession) {
    return fail(AUTH_MESSAGES.resetPasswordInvalid, 400);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    logAuthError("reset-password", error);
    return fail(getAuthErrorMessage(error, "reset-password"));
  }

  cookieStore.delete(PASSWORD_RECOVERY_COOKIE);
  await clearPendingPasswordReset();
  await supabase.auth.signOut();

  return ok("Password updated successfully.", {
    redirectTo: "/login?reset=success",
  });
}

export async function performLogout(): Promise<
  AuthServiceResult<{ redirectTo: string }>
> {
  const supabase = await createClient();
  const cookieStore = await cookies();

  await supabase.auth.signOut();
  cookieStore.delete(PASSWORD_RECOVERY_COOKIE);
  await clearPendingEmailVerification();
  await clearPendingPasswordReset();

  return ok("Signed out successfully.", { redirectTo: "/login" });
}
