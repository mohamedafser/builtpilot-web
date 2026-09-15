"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { requestJson } from "@/lib/api/client";
import { loginSchema, type LoginValues } from "@/lib/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

type LoginResponse = {
  redirectTo: string;
};

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
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

    router.push(result.data.redirectTo);
    router.refresh();
  }

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit(onSubmit)(event);
      }}
    >
      {formError ? <Alert variant="error">{formError}</Alert> : null}

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

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <Label htmlFor="password" className="mb-0">
            Password
          </Label>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-amber-700 transition-colors hover:text-amber-800"
          >
            Forgot password?
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
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
