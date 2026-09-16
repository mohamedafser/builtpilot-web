"use server";

import { getWorkspaceContext } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { currencyForCountry, isAppLanguage } from "@/lib/i18n/config";
import { writeLanguageCookie } from "@/lib/i18n/language-cookie";
import { createClient } from "@/lib/supabase/server";
import {
  workspacePreferencesSchema,
  type WorkspacePreferencesValues,
} from "@/lib/validations/auth";
import { getZodErrorMessage } from "@/lib/validations/error";
import { revalidatePath } from "next/cache";

export type PreferencesActionResult =
  | { error: string }
  | { success: true; message: string };

export async function updateLanguagePreference(
  language: string,
): Promise<PreferencesActionResult> {
  if (!isAppLanguage(language)) {
    return { error: "Unsupported language." };
  }

  const { user } = await getWorkspaceContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ language })
    .eq("id", user.id);

  if (error) {
    console.error("[settings:updateLanguagePreference]", error);
    return { error: "Could not update language preference." };
  }

  await writeLanguageCookie(language);
  revalidatePath("/", "layout");
  return { success: true, message: "Language updated." };
}

export async function updateWorkspacePreferences(
  values: unknown,
): Promise<PreferencesActionResult> {
  const parsed = workspacePreferencesSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Invalid preferences."),
    };
  }

  const data = parsed.data as WorkspacePreferencesValues;
  const { user, business, role } = await getWorkspaceContext();

  if (!business) {
    return { error: "No business workspace found." };
  }

  const supabase = await createClient();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ language: data.language })
    .eq("id", user.id);

  if (profileError) {
    console.error("[settings:updateWorkspacePreferences:profile]", profileError);
    return { error: "Could not update language preference." };
  }

  const canEditWorkspace = hasPermission(role, "organization.settings.manage");

  if (canEditWorkspace) {
    const currencyCode = currencyForCountry(data.country_code);

    const { error: businessError } = await supabase
      .from("businesses")
      .update({
        country_code: data.country_code,
        currency_code: currencyCode,
      })
      .eq("id", business.id);

    if (businessError) {
      console.error(
        "[settings:updateWorkspacePreferences:business]",
        businessError,
      );
      return { error: "Could not update currency preference." };
    }
  }

  await writeLanguageCookie(data.language);
  revalidatePath("/settings");
  revalidatePath("/account");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  return { success: true, message: "Preferences saved." };
}
