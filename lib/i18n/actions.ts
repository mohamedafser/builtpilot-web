"use server";

import { isAppLanguage, type AppLanguage } from "@/lib/i18n/config";
import { writeLanguageCookie } from "@/lib/i18n/language-cookie";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type LanguageActionResult =
  | { error: string }
  | { success: true; language: AppLanguage };

/**
 * Persist language for guests (cookie) and signed-in users (profile + cookie).
 */
export async function setAppLanguage(
  language: string,
): Promise<LanguageActionResult> {
  if (!isAppLanguage(language)) {
    return { error: "Unsupported language." };
  }

  await writeLanguageCookie(language);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update({ language })
        .eq("id", user.id);

      if (error) {
        console.error("[i18n:setAppLanguage]", error);
        return { error: "Could not update language preference." };
      }
    }
  } catch (error) {
    console.error("[i18n:setAppLanguage:auth]", error);
  }

  revalidatePath("/", "layout");
  return { success: true, language };
}
