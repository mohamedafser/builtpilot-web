import { AuthPanel } from "@/components/auth/auth-panel";
import { VerifyResetForm } from "@/components/auth/verify-reset-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify reset code",
};

export default async function VerifyResetPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthPanel
      title="Verify your email"
      description="Enter the 6-digit code we sent to reset your BuildPilot password."
    >
      <VerifyResetForm initialMessage={params.message ?? null} />
    </AuthPanel>
  );
}
