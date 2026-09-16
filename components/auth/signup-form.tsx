"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { requestJson } from "@/lib/api/client";
import { useLocale } from "@/lib/i18n/locale-context";
import { signupSchema, type SignupValues } from "@/lib/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

type SignupResponse = {
  email: string;
  expiresAt?: number;
  retryAfterSeconds?: number;
  redirectTo?: string;
  needsVerification?: boolean;
};

export function SignupForm({
  initialEmail,
  initialOrganization,
}: {
  initialEmail?: string;
  initialOrganization?: string;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [formError, setFormError] = useState<string | null>(null);
  const isInviteSignup = Boolean(initialEmail && initialOrganization);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      full_name: "",
      business_name: initialOrganization ?? "",
      email: initialEmail ?? "",
      password: "",
      confirm_password: "",
    },
  });

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <div>
        <Label htmlFor="full_name">
          {t("auth.fullName")} <span className="text-red-600">*</span>
        </Label>
        <Input
          id="full_name"
          autoComplete="name"
          placeholder="Your name"
          className="h-11"
          required
          aria-required="true"
          error={Boolean(errors.full_name)}
          {...register("full_name", { required: true })}
        />
        {errors.full_name ? (
          <p className="mt-1.5 text-sm text-red-600">
            {errors.full_name.message}
          </p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="email">
          {t("auth.email")} <span className="text-red-600">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          className="h-11"
          required
          readOnly={Boolean(initialEmail)}
          aria-required="true"
          error={Boolean(errors.email)}
          {...register("email", { required: true })}
        />
        {errors.email ? (
          <p className="mt-1.5 text-sm text-red-600">{errors.email.message}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="password">
          {t("auth.password")} <span className="text-red-600">*</span>
        </Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className="h-11"
          required
          aria-required="true"
          error={Boolean(errors.password)}
          {...register("password", { required: true })}
        />
        <p className="mt-1.5 text-xs text-stone-500">
          Must be at least 8 characters and include 1 uppercase letter, 1
          number, and 1 special character.
        </p>
        {errors.password ? (
          <p className="mt-1.5 text-sm text-red-600">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="confirm_password">
          {t("auth.confirmPassword")} <span className="text-red-600">*</span>
        </Label>
        <PasswordInput
          id="confirm_password"
          autoComplete="new-password"
          placeholder="Repeat password"
          className="h-11"
          required
          aria-required="true"
          error={Boolean(errors.confirm_password)}
          {...register("confirm_password", { required: true })}
        />
        {errors.confirm_password ? (
          <p className="mt-1.5 text-sm text-red-600">
            {errors.confirm_password.message}
          </p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="business_name">
          {t("auth.businessName")} <span className="text-red-600">*</span>
        </Label>
        <Input
          id="business_name"
          autoComplete="organization"
          placeholder="ABC Constructions"
          className="h-11"
          required
          readOnly={isInviteSignup}
          aria-required="true"
          error={Boolean(errors.business_name)}
          {...register("business_name", { required: true })}
        />
        {isInviteSignup ? (
          <p className="mt-1.5 text-xs text-stone-500">
            You are joining this organization from an invitation.
          </p>
        ) : null}
        {errors.business_name ? (
          <p className="mt-1.5 text-sm text-red-600">
            {errors.business_name.message}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        size="lg"
        fullWidth
        disabled={isSubmitting}
        icon={UserPlus}
      >
        {isSubmitting ? t("auth.creatingAccount") : t("auth.createAccount")}
      </Button>
    </form>
  );
}
