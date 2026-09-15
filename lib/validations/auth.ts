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

const emailSchema = z.string().trim().email("Enter a valid email address.");
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.");

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
      .min(2, "Full name must be at least 2 characters.")
      .max(80, "Full name is too long."),
    business_name: z
      .string()
      .trim()
      .min(2, "Business name must be at least 2 characters.")
      .max(120, "Business name is too long."),
    country_code: supportedCountrySchema,
    language: z.enum(SUPPORTED_LANGUAGES),
    email: emailSchema,
    password: passwordSchema,
    confirm_password: z.string().min(1, "Confirm your password."),
  })
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

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm_password: z.string().min(1, "Confirm your password."),
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
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
export type WorkspacePreferencesValues = z.infer<
  typeof workspacePreferencesSchema
>;

export { CURRENCY_OPTIONS, LANGUAGE_LABELS, SIGNUP_COUNTRIES };
export type { AppLanguage };