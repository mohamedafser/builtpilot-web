import { AuthPanel } from "@/components/auth/auth-panel";
import { LoginForm } from "@/components/auth/login-form";
import { Alert } from "@/components/ui/alert";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    error?: string;
    reset?: string;
    verified?: string;
    email?: string;
  }>;
}) {
  const params = await searchParams;
  const initialEmail = params.email?.trim().toLowerCase();

  return (
    <AuthPanel
      title="Welcome back"
      description="Sign in to manage projects, costs, and client updates."
    >
      {params.reset === "success" ? (
        <Alert variant="success" className="mb-4">
          Your password was updated. Sign in with your new password.
        </Alert>
      ) : null}
      {params.verified === "1" ? (
        <Alert variant="success" className="mb-4">
          Email verified successfully. Please sign in to continue.
        </Alert>
      ) : null}
      {params.error ? (
        <Alert variant="error" className="mb-4">
          Authentication failed. Please sign in again.
        </Alert>
      ) : null}
      <LoginForm nextPath={params.next} initialEmail={initialEmail} />
    </AuthPanel>
  );
}
