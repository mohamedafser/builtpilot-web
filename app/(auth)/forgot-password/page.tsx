import { AuthPanel } from "@/components/auth/auth-panel";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthPanel
      title="Reset your password"
      description="Enter your account email and we will send a reset link if it exists."
      footer={
        <p className="text-center text-sm text-stone-500">
          Remembered your password?{" "}
          <Link
            href="/login"
            className="font-medium text-amber-700 transition-colors hover:text-amber-800"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthPanel>
  );
}
