"use server";

import { performLogout } from "@/lib/auth/service";
import { redirect } from "next/navigation";

/** Form-action logout for sidebar / logout button. Prefer POST /api/auth/logout for JSON clients. */
export async function signOut() {
  const result = await performLogout();
  redirect(result.ok ? result.data.redirectTo : "/login");
}

/**
 * Sign out the current session and continue an invite signup URL.
 * Only relative /signup paths with invite query params are allowed.
 */
export async function signOutForInvite(formData: FormData) {
  const continueHref = String(formData.get("continueHref") ?? "/signup");

  const result = await performLogout();
  if (!result.ok) {
    redirect("/login");
  }

  let safePath = "/signup";
  try {
    const url = new URL(continueHref, "http://localhost");
    if (
      url.pathname === "/signup" &&
      url.searchParams.get("email") &&
      (url.searchParams.get("org") || url.searchParams.get("organization"))
    ) {
      safePath = `${url.pathname}${url.search}`;
    }
  } catch {
    safePath = "/signup";
  }

  redirect(safePath);
}
