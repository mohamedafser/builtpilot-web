"use client";

import { updateLanguagePreference } from "@/app/(dashboard)/settings/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
} from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/locale-context";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UserPreferencesForm({
  initialLanguage,
}: {
  initialLanguage: AppLanguage;
}) {
  const router = useRouter();
  const { t, setLanguage } = useLocale();
  const [language, setLanguageState] = useState(initialLanguage);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDirty = language !== initialLanguage;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const result = await updateLanguagePreference(language);

    setIsSubmitting(false);

    if ("error" in result) {
      setFormError(result.error);
      return;
    }

    setLanguage(language);
    setSuccessMessage(result.message || t("settings.preferencesSaved"));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {formError ? <Alert variant="error">{formError}</Alert> : null}
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

      <div className="max-w-sm">
        <Label htmlFor="user_language">{t("common.language")}</Label>
        <Select
          id="user_language"
          className="mt-1 h-10"
          value={language}
          onChange={(event) =>
            setLanguageState(event.target.value as AppLanguage)
          }
        >
          {SUPPORTED_LANGUAGES.map((code) => (
            <option key={code} value={code}>
              {LANGUAGE_LABELS[code]}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-xs text-stone-500">{t("settings.languageHelp")}</p>
      </div>

      <Button type="submit" size="sm" disabled={isSubmitting || !isDirty} icon={Save}>
        {isSubmitting ? t("common.loading") : t("common.save")}
      </Button>
    </form>
  );
}
