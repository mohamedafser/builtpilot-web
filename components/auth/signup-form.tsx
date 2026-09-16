"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Select } from "@/components/ui/select";
import { requestJson } from "@/lib/api/client";
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
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

type SignupResponse = {
  email: string;
  expiresAt?: number;
  retryAfterSeconds?: number;
  redirectTo?: string;
  needsVerification?: boolean;
};

export function SignupForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
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

  async function onSubmit(values: SignupValues) {
    setFormError(null);

    const result = await requestJson<SignupResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(values),
      notify: false,
    });

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    router.push(result.data.redirectTo || "/verify-email");
    router.refresh();
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
