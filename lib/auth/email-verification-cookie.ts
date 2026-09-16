import {
  parsePendingEmailVerification,
  PENDING_EMAIL_VERIFY_COOKIE,
  EMAIL_OTP_EXPIRY_SECONDS,
  type PendingEmailVerification,
} from "@/lib/auth/email-verification";
import { cookies } from "next/headers";

export async function readPendingEmailVerification() {
  const cookieStore = await cookies();
  return parsePendingEmailVerification(
    cookieStore.get(PENDING_EMAIL_VERIFY_COOKIE)?.value,
  );
}

export async function writePendingEmailVerification(
  value: PendingEmailVerification,
) {
  const cookieStore = await cookies();
  cookieStore.set(PENDING_EMAIL_VERIFY_COOKIE, JSON.stringify(value), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: EMAIL_OTP_EXPIRY_SECONDS * 2,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearPendingEmailVerification() {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_EMAIL_VERIFY_COOKIE);
}
