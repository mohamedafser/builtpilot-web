import {
  CURRENCY_OPTIONS,
  LANGUAGE_LABELS,
  SIGNUP_COUNTRIES,
  SUPPORTED_COUNTRIES,
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
} from "@/lib/i18n/config";
import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .email("Enter a valid email address.");

/** Basic password for login (existing accounts may not match new strength rules). */
const passwordSchema = z
  .string()
  .min(1, "Password is required.")
  .min(8, "Password must be at least 8 characters.");

/**
 * Strong password for signup / reset:
 * 8+ chars, 1 uppercase, 1 number, 1 special character.
 */
const strongPasswordSchema = z
  .string()
  .min(1, "Password is required.")
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
  .regex(/[0-9]/, "Password must include at least one number.")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must include at least one special character.",
  );

const supportedCountrySchema = z.enum(SUPPORTED_COUNTRIES, {
  message: "Select India or United Arab Emirates.",
});

const supportedCurrencySchema = z.enum(SUPPORTED_CURRENCIES, {
  message: "Select INR or AED.",
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signupSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(1, "Full name is required.")
      .min(2, "Full name must be at least 2 characters.")
      .max(80, "Full name is too long."),
    business_name: z
      .string()
      .trim()
      .min(1, "Company name is required.")
      .min(2, "Company name must be at least 2 characters.")
      .max(120, "Company name is too long."),
    email: emailSchema,
    password: strongPasswordSchema,
    confirm_password: z.string().min(1, "Confirm password is required."),
  })
  .strict()
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resendSignupSchema = z.object({
  email: emailSchema,
});

export const resendPasswordResetSchema = z.object({
  email: emailSchema,
});

export const verifySignupOtpSchema = z.object({
  email: emailSchema,
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit verification code."),
});

export const verifyPasswordResetOtpSchema = z.object({
  email: emailSchema,
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit verification code."),
});

export const resetPasswordSchema = z
  .object({
    password: strongPasswordSchema,
    confirm_password: z.string().min(1, "Confirm password is required."),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

export const workspacePreferencesSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES),
  country_code: supportedCountrySchema,
  currency_code: supportedCurrencySchema,
});

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResendSignupValues = z.infer<typeof resendSignupSchema>;
export type ResendPasswordResetValues = z.infer<
  typeof resendPasswordResetSchema
>;
export type VerifySignupOtpValues = z.infer<typeof verifySignupOtpSchema>;
export type VerifyPasswordResetOtpValues = z.infer<
  typeof verifyPasswordResetOtpSchema
>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type WorkspacePreferencesValues = z.infer<
  typeof workspacePreferencesSchema
>;

export { CURRENCY_OPTIONS, LANGUAGE_LABELS, SIGNUP_COUNTRIES };
export type { AppLanguage };