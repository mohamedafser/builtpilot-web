"use client";

import { AuthPanel } from "@/components/auth/auth-panel";
import { InviteSessionConflict } from "@/components/auth/invite-session-conflict";
import { SignupForm } from "@/components/auth/signup-form";
import { useLocale } from "@/lib/i18n/locale-context";
import Link from "next/link";

export function SignupAuthPanel({
  initialEmail,
  initialOrganization,
  sessionEmail,
  continueHref,
}: {
  initialEmail?: string;
  initialOrganization?: string;
  sessionEmail?: string | null;
  continueHref?: string;
}) {
  const { t } = useLocale();
  const isInviteSignup = Boolean(initialEmail && initialOrganization);
  const hasSessionConflict =
    Boolean(sessionEmail) &&
    Boolean(initialEmail) &&
    sessionEmail?.trim().toLowerCase() !== initialEmail?.trim().toLowerCase();

  return (
    <AuthPanel
      title={
        hasSessionConflict
          ? t("auth.inviteConflictTitle")
          : t("auth.signupTitle")
      }
      description={
        hasSessionConflict
          ? t("auth.inviteConflictBody")
          : isInviteSignup
            ? `Create your account to join ${initialOrganization} with the invited email address.`
            : initialEmail
              ? "Create your account with the invited email address to join the organization workspace."
              : t("auth.signupSubtitle")
      }
      footer={
        hasSessionConflict ? null : (
          <p className="text-center text-sm text-stone-500">
            {t("auth.hasAccount")}{" "}
            <Link
              href="/login"
              className="font-medium text-amber-700 transition-colors hover:text-amber-800"
            >
              {t("common.signIn")}
            </Link>
          </p>
        )
      }
    >
      {hasSessionConflict && sessionEmail && initialEmail && continueHref ? (
        <InviteSessionConflict
          currentEmail={sessionEmail}
          invitedEmail={initialEmail}
          organizationName={initialOrganization}
          continueHref={continueHref}
        />
      ) : (
        <SignupForm
          initialEmail={initialEmail}
          initialOrganization={initialOrganization}
        />
      )}
    </AuthPanel>
  );
}
