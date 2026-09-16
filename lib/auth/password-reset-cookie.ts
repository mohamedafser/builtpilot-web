import {
  parsePendingEmailVerification,
  PENDING_PASSWORD_RESET_COOKIE,
  EMAIL_OTP_EXPIRY_SECONDS,
  type PendingEmailVerification,
} from "@/lib/auth/email-verification";
import { cookies } from "next/headers";

export async function readPendingPasswordReset() {
  const cookieStore = await cookies();
  return parsePendingEmailVerification(
    cookieStore.get(PENDING_PASSWORD_RESET_COOKIE)?.value,
  );
}

export async function writePendingPasswordReset(
  value: PendingEmailVerification,
) {
  const cookieStore = await cookies();
  cookieStore.set(PENDING_PASSWORD_RESET_COOKIE, JSON.stringify(value), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: EMAIL_OTP_EXPIRY_SECONDS * 2,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearPendingPasswordReset() {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_PASSWORD_RESET_COOKIE);
}
