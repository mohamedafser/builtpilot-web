import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import type { Business, UserRole } from "@/types";
import type { User } from "@supabase/supabase-js";

export async function getApiWorkspace(): Promise<
  | { ok: true; user: User; business: Business; role: UserRole }
  | { ok: false; status: 401 | 403; message: string }
> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      status: 401,
      message: "You must be signed in to continue.",
    };
  }

  const membership = await getCurrentMembership();

  if (!membership) {
    return {
      ok: false,
      status: 403,
      message: "No business workspace was found for this account.",
    };
  }

  return {
    ok: true,
    user,
    business: membership.business,
    role: membership.role,
  };
}
