"use client";

import { AuthPanel } from "@/components/auth/auth-panel";
import { SignupForm } from "@/components/auth/signup-form";
import Link from "next/link";
import { useState } from "react";

export function SignupAuthPanel() {
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  return (
    <AuthPanel
      title={
        awaitingConfirmation
          ? "Check your email"
          : "Create your workspace"
      }
      description={
        awaitingConfirmation
          ? "Please check your email to confirm your BuildPilot account."
          : "Set up BuildPilot for your construction business in a few minutes."
      }
      footer={
        awaitingConfirmation ? undefined : (
          <p className="text-center text-sm text-stone-500">
            Already registered?{" "}
            <Link
              href="/login"
              className="font-medium text-amber-700 transition-colors hover:text-amber-800"
            >
              Sign in
            </Link>
          </p>
        )
      }
    >
      <SignupForm onAwaitingConfirmationChange={setAwaitingConfirmation} />
    </AuthPanel>
  );
}
