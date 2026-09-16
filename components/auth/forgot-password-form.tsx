"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestJson } from "@/lib/api/client";
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "@/lib/validations/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

type ForgotPasswordResponse = {
  redirectTo?: string;
};

export function ForgotPasswordForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: ForgotPasswordValues) {
    setFormError(null);
    setSuccessMessage(null);

    const result = await requestJson<ForgotPasswordResponse>(
      "/api/auth/forgot-password",
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

    if (result.data.redirectTo) {
      router.push(result.data.redirectTo);
      router.refresh();
      return;
    }

    setSuccessMessage(result.message);
  }

  if (successMessage) {
    return <Alert variant="success">{successMessage}</Alert>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

      <Button
        type="submit"
        size="lg"
        fullWidth
        disabled={isSubmitting}
        icon={Mail}
      >
        {isSubmitting ? "Sending code..." : "Send verification code"}
      </Button>
    </form>
  );
}
