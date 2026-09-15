import { AuthPanel } from "@/components/auth/auth-panel";
import { LoginForm } from "@/components/auth/login-form";
import { Alert } from "@/components/ui/alert";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; reset?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthPanel
      title="Welcome back"
      description="Sign in to manage projects, costs, and client updates."
      footer={
        <p className="text-center text-sm text-stone-500">
          Need an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-amber-700 transition-colors hover:text-amber-800"
          >
            Create one
          </Link>
        </p>
      }
    >
      {params.reset === "success" ? (
        <Alert variant="success" className="mb-4">
          Your password was updated. Sign in with your new password.
        </Alert>
      ) : null}
      {params.error ? (
        <Alert variant="error" className="mb-4">
          Authentication failed. Please sign in again.
        </Alert>
      ) : null}
      <LoginForm nextPath={params.next} />
    </AuthPanel>
  );
}
