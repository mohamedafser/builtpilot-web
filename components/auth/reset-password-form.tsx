"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { requestJson } from "@/lib/api/client";
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from "@/lib/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

type ResetPasswordResponse = {
  redirectTo: string;
};

export function ResetPasswordForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirm_password: "",
    },
  });

  async function onSubmit(values: ResetPasswordValues) {
    setFormError(null);

    const result = await requestJson<ResetPasswordResponse>(
      "/api/auth/reset-password",
      {
        method: "POST",
        body: JSON.stringify(values),
        notify: false,
      },
    );

    if (!result.ok) {
      setFormError(result.message);
      return;
    }

    router.push(result.data.redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <div>
        <Label htmlFor="password">New password</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className="h-11"
          error={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password ? (
          <p className="mt-1.5 text-sm text-red-600">{errors.password.message}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="confirm_password">Confirm password</Label>
        <PasswordInput
          id="confirm_password"
          autoComplete="new-password"
          placeholder="Repeat your password"
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

      <Button
        type="submit"
        size="lg"
        fullWidth
        disabled={isSubmitting}
        icon={KeyRound}
      >
        {isSubmitting ? "Updating password..." : "Update password"}
      </Button>
    </form>
  );
}
