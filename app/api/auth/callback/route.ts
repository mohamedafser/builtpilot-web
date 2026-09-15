import {
  PASSWORD_RECOVERY_COOKIE,
  PASSWORD_RECOVERY_MAX_AGE,
} from "@/lib/auth/constants";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const EMAIL_OTP_TYPES = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
] as const;

type SupportedEmailOtpType = (typeof EMAIL_OTP_TYPES)[number];

function isEmailOtpType(value: string): value is SupportedEmailOtpType {
  return EMAIL_OTP_TYPES.some((type) => type === value);
}

function safeNextPath(next: string | null) {
  return next && next.startsWith("/") ? next : "/dashboard";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const next = safeNextPath(searchParams.get("next"));

  const supabase = await createClient();
  let exchangeError: { message: string } | null = null;
  let recovered = typeParam === "recovery" || next === "/reset-password";

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    exchangeError = error;
  } else if (tokenHash && typeParam && isEmailOtpType(typeParam)) {
    const { error } = await supabase.auth.verifyOtp({
      type: typeParam,
      token_hash: tokenHash,
    });
    exchangeError = error;
    recovered = recovered || typeParam === "recovery";
  } else {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  if (exchangeError) {
    console.error("[auth:callback]", exchangeError.message);
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const destination = recovered ? "/reset-password" : next;
  const response = NextResponse.redirect(`${origin}${destination}`);

  if (recovered) {
    response.cookies.set(PASSWORD_RECOVERY_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: PASSWORD_RECOVERY_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}
