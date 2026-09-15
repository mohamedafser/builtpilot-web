export const PASSWORD_RECOVERY_COOKIE = "bp_password_recovery";
export const PASSWORD_RECOVERY_MAX_AGE = 60 * 60;

/** Cooldown before a confirmation email can be resent. */
export const SIGNUP_RESEND_COOLDOWN_SECONDS = 5 * 60;

export const AUTH_MESSAGES = {
  signupSuccess:
    "Check your email to confirm your account, then sign in.",
  signupResendSuccess:
    "Confirmation email sent again. Check your inbox (and spam folder).",
  signupDuplicate:
    "An account with this email already exists. Please sign in instead.",
  signupFailed: "Unable to create your account. Please try again.",
  signupResendFailed:
    "Unable to resend the confirmation email. Please try again.",
  rateLimited: "Too many attempts. Please wait a moment and try again.",
  loginInvalid: "Invalid email or password.",
  loginUnconfirmed: "Please verify your email before signing in.",
  loginFailed: "Something went wrong. Please try again.",
  forgotPasswordSuccess:
    "If an account exists for that email, we sent a password reset link.",
  forgotPasswordFailed: "Unable to send a reset link. Please try again.",
  resetPasswordInvalid:
    "This password reset link is invalid or has expired.",
  resetPasswordSame:
    "Choose a password that is different from your current password.",
  resetPasswordFailed: "Unable to update your password. Please try again.",
  genericFailed: "Something went wrong. Please try again.",
} as const;
