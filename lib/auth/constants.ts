export const PASSWORD_RECOVERY_COOKIE = "bp_password_recovery";
export const PASSWORD_RECOVERY_MAX_AGE = 60 * 60;

/** @deprecated Use EMAIL_OTP_RESEND_COOLDOWN_SECONDS from email-verification. */
export const SIGNUP_RESEND_COOLDOWN_SECONDS = 60;

export {
  EMAIL_OTP_EXPIRY_SECONDS,
  EMAIL_OTP_MAX_ATTEMPTS,
  EMAIL_OTP_RESEND_COOLDOWN_SECONDS,
} from "@/lib/auth/email-verification";

export const AUTH_MESSAGES = {
  signupSuccess:
    "We sent a 6-digit verification code to your email. Enter it to verify your account.",
  signupResendSuccess: "New verification code sent.",
  signupDuplicate:
    "An account with this email already exists. Please sign in instead.",
  signupFailed: "Unable to create your account. Please try again.",
  signupResendFailed:
    "Unable to resend the verification code. Please try again.",
  rateLimited: "Too many attempts. Please wait a moment and try again.",
  emailSendRateLimited:
    "Too many verification emails were sent recently. Please wait about an hour before signing up or requesting another code.",
  loginInvalid: "Invalid email or password.",
  loginUnconfirmed:
    "Your email address hasn't been verified yet. Please enter the verification code we sent to your email.",
  loginFailed: "Something went wrong. Please try again.",
  verifyOtpInvalid: "Invalid verification code. Please try again.",
  verifyOtpExpired:
    "Your verification code has expired. Please request a new code.",
  verifyOtpLocked:
    "Too many incorrect attempts. Please request a new verification code.",
  verifyOtpFailed: "Unable to verify your email. Please try again.",
  verifyOtpSuccess: "Email verified successfully.",
  verifyOtpMissingSession:
    "Start by signing up or signing in so we can verify your email.",
  forgotPasswordSuccess:
    "If an account exists for that email, we sent a 6-digit verification code.",
  forgotPasswordCodeSent:
    "We sent a 6-digit verification code to your email. Enter it to reset your password.",
  forgotPasswordResendSuccess: "New password reset code sent.",
  forgotPasswordFailed:
    "Unable to send a verification code. Please try again.",
  forgotPasswordMissingSession:
    "Start by requesting a password reset code for your email.",
  resetPasswordInvalid:
    "This password reset session is invalid or has expired.",
  resetPasswordSame:
    "Choose a password that is different from your current password.",
  resetPasswordFailed: "Unable to update your password. Please try again.",
  genericFailed: "Something went wrong. Please try again.",
} as const;
