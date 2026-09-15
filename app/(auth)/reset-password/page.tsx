import { AuthPanel } from "@/components/auth/auth-panel";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { PASSWORD_RECOVERY_COOKIE, getCurrentUser } from "@/lib/auth";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Set a new password",
};

export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const recovery = cookieStore.get(PASSWORD_RECOVERY_COOKIE);
  const user = await getCurrentUser();

  if (!recovery || !user) {
    redirect("/forgot-password");
  }

  return (
    <AuthPanel
      title="Choose a new password"
      description={`Enter a new password for ${user.email ?? "your account"}.`}
    >
      <ResetPasswordForm />
    </AuthPanel>
  );
}
