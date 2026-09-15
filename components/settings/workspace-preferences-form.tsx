"use client";

import { updateWorkspacePreferences } from "@/app/(dashboard)/settings/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  currencyForCountry,
  LANGUAGE_LABELS,
  SIGNUP_COUNTRIES,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
} from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/locale-context";
import {
  CURRENCY_OPTIONS,
  workspacePreferencesSchema,
  type WorkspacePreferencesValues,
} from "@/lib/validations/auth";
import { Save } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

export function WorkspacePreferencesForm({
  initialLanguage,
  initialCountryCode,
}: {
  initialLanguage: AppLanguage;
  initialCountryCode: "IN" | "AE";
  initialCurrencyCode?: "INR" | "AED";
}) {
  const router = useRouter();
  const { t, setLanguage } = useLocale();
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<WorkspacePreferencesValues>({
    resolver: zodResolver(workspacePreferencesSchema),
    defaultValues: {
      language: initialLanguage,
      country_code: initialCountryCode,
      currency_code: currencyForCountry(initialCountryCode),
    },
  });

  const countryCode = watch("country_code");
  const currencyCode = currencyForCountry(countryCode);
  const previousCountry = useRef(initialCountryCode);

  useEffect(() => {
    if (previousCountry.current === countryCode) {
      return;
    }
    previousCountry.current = countryCode;
    setValue("currency_code", currencyCode, { shouldDirty: true });
  }, [countryCode, currencyCode, setValue]);

  async function onSubmit(values: WorkspacePreferencesValues) {
    setFormError(null);
    setSuccessMessage(null);

    const nextCurrency = currencyForCountry(values.country_code);
    const result = await updateWorkspacePreferences({
      ...values,
      currency_code: nextCurrency,
    });

    if ("error" in result) {
      setFormError(result.error);
      return;
    }

    setLanguage(values.language);
    reset({
      language: values.language,
      country_code: values.country_code,
      currency_code: nextCurrency,
    });
    previousCountry.current = values.country_code;
    setSuccessMessage(result.message || t("settings.preferencesSaved"));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {formError ? <Alert variant="error">{formError}</Alert> : null}
      {successMessage ? (
        <Alert variant="success">{successMessage}</Alert>
      ) : null}

      <div>
        <Label htmlFor="language">{t("common.language")}</Label>
        <Select id="language" {...register("language")}>
          {SUPPORTED_LANGUAGES.map((code) => (
            <option key={code} value={code}>
              {LANGUAGE_LABELS[code]}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-xs text-stone-500">{t("settings.languageHelp")}</p>
        {errors.language ? (
          <p className="mt-1 text-sm text-red-600">{errors.language.message}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="country_code">{t("common.country")}</Label>
        <Select
          id="country_code"
          error={Boolean(errors.country_code)}
          {...register("country_code")}
        >
          {SIGNUP_COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </Select>
        {errors.country_code ? (
          <p className="mt-1 text-sm text-red-600">
            {errors.country_code.message}
          </p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="currency_code">{t("common.currency")}</Label>
        <input type="hidden" {...register("currency_code")} />
        <Select id="currency_code" value={currencyCode} disabled>
          {CURRENCY_OPTIONS.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.label}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-xs text-stone-500">{t("settings.currencyHelp")}</p>
      </div>

      <Button type="submit" disabled={isSubmitting || !isDirty} icon={Save}>
        {isSubmitting ? t("common.loading") : t("common.save")}
      </Button>
    </form>
  );
}