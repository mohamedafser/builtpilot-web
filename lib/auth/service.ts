import {
  AUTH_MESSAGES,
  PASSWORD_RECOVERY_COOKIE,
  SIGNUP_RESEND_COOLDOWN_SECONDS,
} from "@/lib/auth/constants";
import { getAuthErrorMessage, logAuthError } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  resendSignupSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/lib/validations/auth";
import { getZodErrorMessage } from "@/lib/validations/error";
import { cookies } from "next/headers";

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

export function resolveAuthOrigin(request: Request) {
  const requestOrigin = request.headers.get("origin")?.trim();
  if (requestOrigin) {
    return requestOrigin.replace(/\/$/, "");
  }

  try {
    return new URL(request.url).origin.replace(/\/$/, "");
  } catch {
    // fall through
  }

  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://buildpilot-henna.vercel.app";

  return configured.replace(/\/$/, "");
}

export function safeNextPath(nextPath?: string | null) {
  return nextPath && nextPath.startsWith("/") ? nextPath : "/dashboard";
}

function isUnconfirmedDuplicateSignup(
  user: {
    identities?: Array<unknown> | null;
  } | null,
) {
  // Supabase returns a user with an empty identities list when the email
  // already exists and email confirmation is required.
  return Boolean(
    user && Array.isArray(user.identities) && user.identities.length === 0,
  );
}

function authStatusForMessage(message: string, flow: "login" | "signup") {
  if (message === AUTH_MESSAGES.rateLimited) {
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

export async function performLogin(
  values: unknown,
  nextPath?: string | null,
): Promise<AuthServiceResult<{ redirectTo: string }>> {
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
    logAuthError("login", error);
    const message = getAuthErrorMessage(error, "login");
    return fail(message, authStatusForMessage(message, "login"));
  }

  return ok("Signed in successfully.", {
    redirectTo: safeNextPath(nextPath),
  });
}

export async function performSignup(
  values: unknown,
  origin: string,
): Promise<
  AuthServiceResult<{
    email: string;
    retryAfterSeconds?: number;
    redirectTo?: string;
  }>
> {
  const parsed = signupSchema.safeParse(values);

  if (!parsed.success) {
    return fail(getZodErrorMessage(parsed.error, "Invalid signup details."));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.full_name,
        business_name: parsed.data.business_name,
        country_code: parsed.data.country_code,
        language: parsed.data.language,
      },
      emailRedirectTo: `${origin}/api/auth/callback`,
    },
  });

  if (error) {
    logAuthError("signup", error);
    const message = getAuthErrorMessage(error, "signup");
    return fail(message, authStatusForMessage(message, "signup"));
  }

  if (isUnconfirmedDuplicateSignup(data.user)) {
    return fail(AUTH_MESSAGES.signupDuplicate, 409);
  }

  if (!data.session) {
    return ok(AUTH_MESSAGES.signupSuccess, {
      email: parsed.data.email,
      retryAfterSeconds: SIGNUP_RESEND_COOLDOWN_SECONDS,
    });
  }

  return ok("Account created successfully.", {
    email: parsed.data.email,
    redirectTo: "/dashboard",
  });
}

export async function performResendSignupEmail(
  values: unknown,
  origin: string,
): Promise<AuthServiceResult<{ email: string; retryAfterSeconds: number }>> {
  const parsed = resendSignupSchema.safeParse(values);

  if (!parsed.success) {
    return fail(
      getZodErrorMessage(parsed.error, "Enter a valid email address."),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/api/auth/callback`,
    },
  });

  if (error) {
    logAuthError("signup-resend", error);
    const message = getAuthErrorMessage(error, "signup-resend");
    return fail(
      message,
      message === AUTH_MESSAGES.rateLimited ? 429 : 400,
      message === AUTH_MESSAGES.rateLimited
        ? SIGNUP_RESEND_COOLDOWN_SECONDS
        : undefined,
    );
  }

  return ok(AUTH_MESSAGES.signupResendSuccess, {
    email: parsed.data.email,
    retryAfterSeconds: SIGNUP_RESEND_COOLDOWN_SECONDS,
  });
}

export async function performForgotPassword(
  values: unknown,
  origin: string,
): Promise<AuthServiceResult<Record<string, never>>> {
  const parsed = forgotPasswordSchema.safeParse(values);

  if (!parsed.success) {
    return fail(
      getZodErrorMessage(parsed.error, "Enter a valid email address."),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${origin}/api/auth/callback?next=/reset-password`,
    },
  );

  if (error) {
    logAuthError("forgot-password", error);
    const message = getAuthErrorMessage(error, "forgot-password");
    return fail(message, message === AUTH_MESSAGES.rateLimited ? 429 : 400);
  }

  return ok(AUTH_MESSAGES.forgotPasswordSuccess, {});
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

  return ok("Signed out successfully.", { redirectTo: "/login" });
}
