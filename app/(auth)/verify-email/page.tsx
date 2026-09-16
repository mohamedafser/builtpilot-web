import { AuthPanel } from "@/components/auth/auth-panel";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify email",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthPanel
      title="Verify your email"
      description="Enter the 6-digit code we sent to complete your BuildPilot account setup."
    >
      <VerifyEmailForm initialMessage={params.message ?? null} />
    </AuthPanel>
  );
}
