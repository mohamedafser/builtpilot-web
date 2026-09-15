"use client";

import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";

function LogoutSubmit({
  fullWidth,
  variant,
}: {
  fullWidth?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      variant={variant ?? "secondary"}
      type="submit"
      fullWidth={fullWidth}
      disabled={pending}
      icon={LogOut}
    >
      {pending ? "Signing out..." : "Sign out"}
    </Button>
  );
}

export function LogoutButton({
  fullWidth = true,
  variant = "secondary",
}: {
  fullWidth?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <form action={signOut}>
      <LogoutSubmit fullWidth={fullWidth} variant={variant} />
    </form>
  );
}
