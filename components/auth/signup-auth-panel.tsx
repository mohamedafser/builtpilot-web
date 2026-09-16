"use client";

import { AuthPanel } from "@/components/auth/auth-panel";
import { SignupForm } from "@/components/auth/signup-form";
import Link from "next/link";

export function SignupAuthPanel() {
  return (
    <AuthPanel
      title="Create your workspace"
      description="Set up BuildPilot for your construction business in a few minutes."
      footer={
        <p className="text-center text-sm text-stone-500">
          Already registered?{" "}
          <Link
            href="/login"
            className="font-medium text-amber-700 transition-colors hover:text-amber-800"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <SignupForm />
    </AuthPanel>
  );
}
