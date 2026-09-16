"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { requestJson } from "@/lib/api/client";
import { useLocale } from "@/lib/i18n/locale-context";
import { loginSchema, type LoginValues } from "@/lib/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

type LoginResponse = {
  redirectTo?: string;
  needsVerification?: boolean;
  email?: string;
  expiresAt?: number;
  retryAfterSeconds?: number;
};

export function LoginForm({
  nextPath,
  initialEmail,
}: {
  nextPath?: string;
  initialEmail?: string;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: initialEmail ?? "",
      password: "",
    },
  });

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    const result = await requestJson<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ ...values, next: nextPath }),
      notify: false,
    });

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    if (result.data.needsVerification) {
      router.push(result.data.redirectTo || "/verify-email");
      router.refresh();
      return;
    }

    router.push(result.data.redirectTo || "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <div>
        <Label htmlFor="email">{t("auth.email")}</Label>
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

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <Label htmlFor="password" className="mb-0">
            {t("auth.password")}
          </Label>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-amber-700 transition-colors hover:text-amber-800"
          >
            {t("auth.forgotPassword")}
          </Link>
        </div>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          className="h-11"
          error={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password ? (
          <p className="mt-1.5 text-sm text-red-600">{errors.password.message}</p>
        ) : null}
      </div>

      <Button
        type="submit"
        size="lg"
        fullWidth
        disabled={isSubmitting}
        icon={LogIn}
      >
        {isSubmitting ? t("auth.loggingIn") : t("auth.loginAction")}
      </Button>

      <p className="text-center text-sm text-stone-500">
        {t("auth.noAccount")}{" "}
        <Link
          href="/signup"
          className="font-medium text-amber-700 transition-colors hover:text-amber-800"
        >
          {t("common.getStarted")}
        </Link>
      </p>
    </form>
  );
}
