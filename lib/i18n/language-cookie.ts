import {
  DEFAULT_LANGUAGE,
  isAppLanguage,
  normalizeLanguage,
  type AppLanguage,
} from "@/lib/i18n/config";
import { cookies } from "next/headers";

export const LANGUAGE_COOKIE = "bp_language";
export const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function readLanguageCookie(): Promise<AppLanguage> {
  const cookieStore = await cookies();
  return normalizeLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value);
}

export async function writeLanguageCookie(language: AppLanguage): Promise<void> {
  if (!isAppLanguage(language)) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(LANGUAGE_COOKIE, language, {
    path: "/",
    maxAge: LANGUAGE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
}

export function languageFromCookieHeader(
  cookieHeader: string | null | undefined,
): AppLanguage {
  if (!cookieHeader) {
    return DEFAULT_LANGUAGE;
  }

  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LANGUAGE_COOKIE}=`));

  return normalizeLanguage(match?.split("=")[1]);
}
