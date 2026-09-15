import { AuthPanel } from "@/components/auth/auth-panel";
import { SignupForm } from "@/components/auth/signup-form";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignupPage() {
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
