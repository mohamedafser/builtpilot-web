"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Select } from "@/components/ui/select";
import { requestJson } from "@/lib/api/client";
import {
  AUTH_MESSAGES,
  SIGNUP_RESEND_COOLDOWN_SECONDS,
} from "@/lib/auth/constants";
import {
  currencyForCountry,
  detectCountryFromBrowser,
  LANGUAGE_LABELS,
  SIGNUP_COUNTRIES,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
} from "@/lib/i18n/config";
import {
  CURRENCY_OPTIONS,
  signupSchema,
  type SignupValues,
} from "@/lib/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

type SignupResponse = {
  email: string;
  retryAfterSeconds?: number;
  redirectTo?: string;
};

type ResendResponse = {
  email: string;
  retryAfterSeconds: number;
};

export function SignupForm({
  onAwaitingConfirmationChange,
}: {
  onAwaitingConfirmationChange?: (awaiting: boolean) => void;
} = {}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [resendError, setResendError] = useState<string | null>(null);
  const [isResending, startResendTransition] = useTransition();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      full_name: "",
      business_name: "",
      country_code: "IN",
      language: "en",
      email: "",
      password: "",
      confirm_password: "",
    },
  });

  const countryCode = watch("country_code");
  const currencyCode = currencyForCountry(countryCode);

  useEffect(() => {
    const detected = detectCountryFromBrowser();
    setValue("country_code", detected);
  }, [setValue]);

  useEffect(() => {
    onAwaitingConfirmationChange?.(Boolean(successMessage && pendingEmail));
  }, [successMessage, pendingEmail, onAwaitingConfirmationChange]);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCooldownSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldownSeconds]);

  async function onSubmit(values: SignupValues) {
    setFormError(null);
    setSuccessMessage(null);
    setResendError(null);
    setCooldownSeconds(0);

    const result = await requestJson<SignupResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(values),
      notify: false,
    });

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    if (result.data.redirectTo) {
      router.push(result.data.redirectTo);
      router.refresh();
      return;
    }

    // Timer starts only after signup succeeds and confirmation email is sent.
    setPendingEmail(result.data.email || values.email);
    setSuccessMessage(result.message);
    setCooldownSeconds(
      result.data.retryAfterSeconds ?? SIGNUP_RESEND_COOLDOWN_SECONDS,
    );
  }

  function onResend() {
    if (!pendingEmail || cooldownSeconds > 0) {
      return;
    }

    setResendError(null);
    startResendTransition(async () => {
      const result = await requestJson<ResendResponse>(
        "/api/auth/resend-signup",
        {
          method: "POST",
          body: JSON.stringify({ email: pendingEmail }),
          notify: false,
        },
      );

      if (!result.ok) {
        setResendError(result.message);
        if (result.message === AUTH_MESSAGES.rateLimited) {
          setCooldownSeconds(SIGNUP_RESEND_COOLDOWN_SECONDS);
        }
        return;
      }

      setSuccessMessage(result.message);
      setCooldownSeconds(
        result.data.retryAfterSeconds ?? SIGNUP_RESEND_COOLDOWN_SECONDS,
      );
    });
  }

  if (successMessage && pendingEmail) {
    const canResend = cooldownSeconds <= 0;

    return (
      <div className="space-y-4">
        <Alert variant="success">
          <p className="font-medium">{successMessage}</p>
          <p className="mt-1 text-emerald-700/90">
            We sent a confirmation link to{" "}
            <span className="font-medium">{pendingEmail}</span>.
          </p>
        </Alert>

        {resendError ? <Alert variant="error">{resendError}</Alert> : null}

        <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-600">
          {canResend ? (
            <p>
              Didn&apos;t get the email? You can resend the confirmation link.
            </p>
          ) : (
            <p>
              You can resend the confirmation email in{" "}
              <span className="font-semibold text-stone-800">
                {formatCountdown(cooldownSeconds)}
              </span>
              .
            </p>
          )}
        </div>

        <Button
          type="button"
          size="lg"
          fullWidth
          variant={canResend ? "primary" : "secondary"}
          disabled={!canResend || isResending}
          icon={Mail}
          onClick={onResend}
        >
          {isResending
            ? "Sending..."
            : canResend
              ? "Resend confirmation email"
              : `Resend available in ${formatCountdown(cooldownSeconds)}`}
        </Button>

        <p className="text-center text-sm text-stone-500">
          Already confirmed?{" "}
          <Link
            href="/login"
            className="font-medium text-amber-700 transition-colors hover:text-amber-800"
          >
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            autoComplete="name"
            placeholder="Your name"
            className="h-11"
            error={Boolean(errors.full_name)}
            {...register("full_name")}
          />
          {errors.full_name ? (
            <p className="mt-1.5 text-sm text-red-600">
              {errors.full_name.message}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="business_name">Business name</Label>
          <Input
            id="business_name"
            autoComplete="organization"
            placeholder="Company or firm"
            className="h-11"
            error={Boolean(errors.business_name)}
            {...register("business_name")}
          />
          {errors.business_name ? (
            <p className="mt-1.5 text-sm text-red-600">
              {errors.business_name.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="country_code">Country</Label>
          <Select
            id="country_code"
            className="h-11"
            error={Boolean(errors.country_code)}
            {...register("country_code")}
          >
            {SIGNUP_COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </Select>
          {errors.country_code ? (
            <p className="mt-1.5 text-sm text-red-600">
              {errors.country_code.message}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="currency_code">Currency</Label>
          <Select
            id="currency_code"
            className="h-11"
            value={currencyCode}
            disabled
          >
            {CURRENCY_OPTIONS.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.label}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-xs text-stone-500">
            Set from country · India INR · UAE AED
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="language">Language</Label>
        <Select id="language" className="h-11" {...register("language")}>
          {SUPPORTED_LANGUAGES.map((code) => (
            <option key={code} value={code}>
              {LANGUAGE_LABELS[code as AppLanguage]}
            </option>
          ))}
        </Select>
        <p className="mt-1.5 text-xs text-stone-500">
          Default English · also தமிழ், العربية, हिन्दी
        </p>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          className="h-11"
          error={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email ? (
          <p className="mt-1.5 text-sm text-red-600">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            className="h-11"
            error={Boolean(errors.password)}
            {...register("password")}
          />
          {errors.password ? (
            <p className="mt-1.5 text-sm text-red-600">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="confirm_password">Confirm password</Label>
          <PasswordInput
            id="confirm_password"
            autoComplete="new-password"
            placeholder="Repeat password"
            className="h-11"
            error={Boolean(errors.confirm_password)}
            {...register("confirm_password")}
          />
          {errors.confirm_password ? (
            <p className="mt-1.5 text-sm text-red-600">
              {errors.confirm_password.message}
            </p>
          ) : null}
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        fullWidth
        disabled={isSubmitting}
        icon={UserPlus}
      >
        {isSubmitting ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
