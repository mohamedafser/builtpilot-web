"use server";

import { getWorkspaceContext } from "@/lib/auth";
import { currencyForCountry } from "@/lib/i18n/config";
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

  const canEditWorkspace = role === "owner" || role === "admin";

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

  revalidatePath("/settings");
  revalidatePath("/account");
  revalidatePath("/dashboard");

  return { success: true, message: "Preferences saved." };
}
