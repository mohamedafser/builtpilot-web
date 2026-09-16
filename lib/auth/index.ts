import { cache } from "react";
import { redirect } from "next/navigation";
import { isMissingSchemaError } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/server";
import type { Business, Profile, UserRole } from "@/types";
import type { Session, User } from "@supabase/supabase-js";

export type PublicSchemaStatus = "ready" | "missing" | "error";

function logQueryError(
  scope: string,
  error: { message: string; code?: string },
) {
  if (isMissingSchemaError(error)) {
    return;
  }

  console.error(`[auth:${scope}]`, error.message);
}

export type WorkspaceContext = {
  user: User;
  profile: Profile | null;
  business: Business | null;
  role: UserRole | null;
};

export const getCurrentSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error && !isAuthSessionMissingError(error)) {
    console.error("[auth:getCurrentSession]", error.message);
  }

  return session;
});

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Expected on public auth pages when no cookie/session exists.
  if (error && !isAuthSessionMissingError(error)) {
    console.error("[auth:getCurrentUser]", error.message);
  }

  return user;
});

function isAuthSessionMissingError(error: {
  message?: string;
  name?: string;
  code?: string;
}) {
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("auth session missing") ||
    error.name === "AuthSessionMissingError" ||
    error.code === "session_not_found"
  );
}

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    logQueryError("getCurrentProfile", error);
    return null;
  }

  return data;
});

export const getCurrentMembership = cache(
  async (): Promise<{ role: UserRole; business: Business } | null> => {
    const user = await getCurrentUser();

    if (!user) {
      return null;
    }

    const supabase = await createClient();
    const { data: membership, error: membershipError } = await supabase
      .from("business_members")
      .select("role, business_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      logQueryError("getCurrentMembership", membershipError);
      return null;
    }

    if (!membership) {
      return null;
    }

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", membership.business_id)
      .maybeSingle();

    if (businessError) {
      logQueryError("getCurrentBusiness", businessError);
      return null;
    }

    if (!business) {
      return null;
    }

    return {
      role: membership.role,
      business,
    };
  },
);

export const getCurrentBusiness = cache(async (): Promise<Business | null> => {
  const membership = await getCurrentMembership();
  return membership?.business ?? null;
});

export const getPublicSchemaStatus = cache(
  async (): Promise<PublicSchemaStatus> => {
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);

    if (!error) {
      return "ready";
    }

    if (isMissingSchemaError(error)) {
      return "missing";
    }

    console.error("[auth:getPublicSchemaStatus]", error.message);
    return "error";
  },
);

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function getWorkspaceContext(): Promise<WorkspaceContext> {
  const user = await requireUser();
  const [profile, membership] = await Promise.all([
    getCurrentProfile(),
    getCurrentMembership(),
  ]);

  return {
    user,
    profile,
    business: membership?.business ?? null,
    role: membership?.role ?? null,
  };
}

export {
  getAuthErrorMessage,
  isMissingSchemaError,
  logAuthError,
} from "@/lib/auth/errors";
export {
  AUTH_MESSAGES,
  PASSWORD_RECOVERY_COOKIE,
  PASSWORD_RECOVERY_MAX_AGE,
  SIGNUP_RESEND_COOLDOWN_SECONDS,
} from "@/lib/auth/constants";
