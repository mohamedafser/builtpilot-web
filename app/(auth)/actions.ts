"use server";

import { performLogout } from "@/lib/auth/service";
import { redirect } from "next/navigation";

/** Form-action logout for sidebar / logout button. Prefer POST /api/auth/logout for JSON clients. */
export async function signOut() {
  const result = await performLogout();
  redirect(result.ok ? result.data.redirectTo : "/login");
}
