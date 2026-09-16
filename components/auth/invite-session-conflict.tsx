"use client";

import { signOutForInvite } from "@/app/(auth)/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function InviteSessionConflict({
  currentEmail,
  invitedEmail,
  organizationName,
  continueHref,
}: {
  currentEmail: string;
  invitedEmail: string;
  organizationName?: string;
  continueHref: string;
}) {
  return (
    <div className="space-y-4">
      <Alert variant="info">
        You are currently signed in as <strong>{currentEmail}</strong>. To join
        {organizationName ? (
          <>
            {" "}
            <strong>{organizationName}</strong>
          </>
        ) : (
          " this organization"
        )}{" "}
        as <strong>{invitedEmail}</strong>, sign out first and continue with the
        invitation.
      </Alert>
      <form action={signOutForInvite}>
        <input type="hidden" name="continueHref" value={continueHref} />
        <Button type="submit" fullWidth size="lg" icon={LogOut}>
          Sign out and continue
        </Button>
      </form>
    </div>
  );
}
