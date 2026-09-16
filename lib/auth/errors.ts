import { AUTH_MESSAGES } from "@/lib/auth/constants";

type AuthErrorLike = {
  message: string;
  status?: number;
  code?: string;
};

export type AuthFlow =
  | "login"
  | "signup"
  | "signup-resend"
  | "forgot-password"
  | "reset-password";

function includesAny(value: string, snippets: string[]) {
  return snippets.some((snippet) => value.includes(snippet));
}

function isRateLimited(error: AuthErrorLike, message: string, code: string) {
  return (
    error.status === 429 ||
    includesAny(message, ["rate limit", "too many", "over_request"]) ||
    includesAny(code, ["over_request", "over_email"])
  );
}

function isEmailSendRateLimited(message: string, code: string) {
  return (
    includesAny(message, ["email rate limit", "over_email_send"]) ||
    includesAny(code, ["over_email_send_rate_limit", "over_email"])
  );
}

function isDuplicateEmail(message: string, code: string) {
  return (
    includesAny(message, [
      "already registered",
      "already exists",
      "already in use",
      "email already in use",
      "user already exists",
    ]) ||
    includesAny(code, [
      "user_already_exists",
      "email_address_already_in_use",
      "email_already_in_use",
      "duplicate_user",
    ])
  );
}

export function getAuthErrorMessage(
  error: AuthErrorLike,
  flow: AuthFlow,
): string {
  const message = error.message.toLowerCase();
  const code = error.code?.toLowerCase() ?? "";

  if (isEmailSendRateLimited(message, code)) {
    return AUTH_MESSAGES.emailSendRateLimited;
  }

  if (isRateLimited(error, message, code)) {
    return AUTH_MESSAGES.rateLimited;
  }

  if (flow === "login") {
    if (
      includesAny(message, ["email not confirmed"]) ||
      code === "email_not_confirmed"
    ) {
      return AUTH_MESSAGES.loginUnconfirmed;
    }

    if (
      includesAny(message, ["invalid login", "invalid credentials"]) ||
      code === "invalid_credentials"
    ) {
      return AUTH_MESSAGES.loginInvalid;
    }

    return AUTH_MESSAGES.loginFailed;
  }

  if (flow === "signup" || flow === "signup-resend") {
    if (isDuplicateEmail(message, code)) {
      return AUTH_MESSAGES.signupDuplicate;
    }

    return flow === "signup-resend"
      ? AUTH_MESSAGES.signupResendFailed
      : AUTH_MESSAGES.signupFailed;
  }

  if (flow === "forgot-password") {
    return AUTH_MESSAGES.forgotPasswordFailed;
  }

  if (flow === "reset-password") {
    if (includesAny(message, ["same password", "should be different"])) {
      return AUTH_MESSAGES.resetPasswordSame;
    }

    return AUTH_MESSAGES.resetPasswordFailed;
  }

  return AUTH_MESSAGES.genericFailed;
}

export function isMissingSchemaError(
  error: {
    message?: string;
    code?: string;
  } | null,
): boolean {
  if (!error) {
    return false;
  }

  return (
    error.code === "PGRST205" || (error.message ?? "").includes("schema cache")
  );
}

export function logAuthError(scope: string, error: AuthErrorLike) {
  console.error(`[auth:${scope}]`, {
    message: error.message,
    status: error.status,
    code: error.code,
  });
}
