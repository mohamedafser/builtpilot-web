import { SignupAuthPanel } from "@/components/auth/signup-auth-panel";
import { Alert } from "@/components/ui/alert";
import { AuthPanel } from "@/components/auth/auth-panel";
import { getCurrentUser } from "@/lib/auth";
import { decryptInviteOrganization } from "@/lib/team/invite-token";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Create account",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string;
    org?: string;
    organization?: string;
  }>;
}) {
  const params = await searchParams;
  const initialEmail = params.email?.trim().toLowerCase();
  const encryptedOrg = params.org?.trim();
  const legacyOrganization = params.organization?.trim();

  const hasInviteContext = Boolean(
    initialEmail && (encryptedOrg || legacyOrganization),
  );

  let initialOrganization: string | undefined;
  let inviteTokenInvalid = false;

  if (encryptedOrg) {
    const decrypted = decryptInviteOrganization(encryptedOrg);
    if (!decrypted) {
      inviteTokenInvalid = true;
    } else {
      initialOrganization = decrypted;
    }
  } else if (legacyOrganization) {
    initialOrganization = legacyOrganization;
  }

  if (inviteTokenInvalid) {
    return (
      <AuthPanel
        title="Invitation link invalid"
        description="This invite link could not be verified. Ask your organization owner to resend the invitation."
        footer={
          <p className="text-center text-sm text-stone-500">
            <Link
              href="/signup"
              className="font-medium text-amber-700 transition-colors hover:text-amber-800"
            >
              Create a new account
            </Link>
          </p>
        }
      >
        <Alert variant="error">
          The organization invite token is missing or invalid.
        </Alert>
      </AuthPanel>
    );
  }

  const user = await getCurrentUser();
  const sessionEmail = user?.email?.trim().toLowerCase() ?? null;

  const continueParams = new URLSearchParams();
  if (initialEmail) {
    continueParams.set("email", initialEmail);
  }
  if (encryptedOrg) {
    continueParams.set("org", encryptedOrg);
  } else if (legacyOrganization) {
    continueParams.set("organization", legacyOrganization);
  }
  const continueHref = hasInviteContext
    ? `/signup?${continueParams.toString()}`
    : "/signup";

  return (
    <SignupAuthPanel
      initialEmail={initialEmail}
      initialOrganization={initialOrganization}
      sessionEmail={sessionEmail}
      continueHref={continueHref}
    />
  );
}
