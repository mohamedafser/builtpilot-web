"use client";

import { updateWorkspacePreferences } from "@/app/(dashboard)/settings/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  currencyForCountry,
  SIGNUP_COUNTRIES,
  type AppLanguage,
} from "@/lib/i18n/config";
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

export function OrganizationSettingsForm({
  initialLanguage,
  initialCountryCode,
  canManageWorkspace,
}: {
  initialLanguage: AppLanguage;
  initialCountryCode: "IN" | "AE";
  canManageWorkspace: boolean;
}) {
  const router = useRouter();
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
      language: initialLanguage,
      currency_code: nextCurrency,
    });

    if ("error" in result) {
      setFormError(result.error);
      return;
    }

    reset({
      language: initialLanguage,
      country_code: values.country_code,
      currency_code: nextCurrency,
    });
    previousCountry.current = values.country_code;
    setSuccessMessage("Organization settings saved.");
    router.refresh();
  }

  if (!canManageWorkspace) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-stone-200 bg-stone-50/70 px-3 py-2.5">
          <p className="text-xs text-stone-500">Country</p>
          <p className="text-sm font-medium text-stone-900">
            {SIGNUP_COUNTRIES.find((c) => c.code === initialCountryCode)?.name ??
              initialCountryCode}
          </p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-stone-50/70 px-3 py-2.5">
          <p className="text-xs text-stone-500">Currency</p>
          <p className="text-sm font-medium text-stone-900">
            {currencyForCountry(initialCountryCode)}
          </p>
        </div>
        <p className="sm:col-span-2 text-xs text-stone-500">
          Only Owners and Admins can change organization country and currency.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {formError ? <Alert variant="error">{formError}</Alert> : null}
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="country_code">Country</Label>
          <Select
            id="country_code"
            className="mt-1 h-10"
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
            <p className="mt-1 text-xs text-red-600">
              {errors.country_code.message}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="currency_code">Currency</Label>
          <input type="hidden" {...register("currency_code")} />
          <Select id="currency_code" className="mt-1 h-10" value={currencyCode} disabled>
            {CURRENCY_OPTIONS.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.label}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-stone-500">
            Currency follows the selected country.
          </p>
        </div>
      </div>

      <Button
        type="submit"
        size="sm"
        disabled={isSubmitting || !isDirty}
        icon={Save}
      >
        {isSubmitting ? "Saving..." : "Save organization"}
      </Button>
    </form>
  );
}
