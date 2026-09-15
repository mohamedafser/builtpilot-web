export const SUPPORTED_LANGUAGES = ["en", "ta", "ar", "hi"] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = "en";

export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: "English",
  ta: "தமிழ்",
  ar: "العربية",
  hi: "हिन्दी",
};

export function isAppLanguage(value: string | null | undefined): value is AppLanguage {
  return (
    typeof value === "string" &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
  );
}

export function normalizeLanguage(
  value: string | null | undefined,
): AppLanguage {
  return isAppLanguage(value) ? value : DEFAULT_LANGUAGE;
}

export function isRtlLanguage(language: AppLanguage): boolean {
  return language === "ar";
}

/** Supported countries for now. More will be added later. */
export const SUPPORTED_COUNTRIES = ["IN", "AE"] as const;

export type SupportedCountryCode = (typeof SUPPORTED_COUNTRIES)[number];

export const SIGNUP_COUNTRIES = [
  { code: "IN", name: "India", currency: "INR" },
  { code: "AE", name: "United Arab Emirates", currency: "AED" },
] as const;

export type CountryCode = SupportedCountryCode;

export const SUPPORTED_CURRENCIES = ["INR", "AED"] as const;

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const COUNTRY_CURRENCY: Record<SupportedCountryCode, SupportedCurrencyCode> =
  {
    IN: "INR",
    AE: "AED",
  };

export const CURRENCY_OPTIONS = [
  { code: "INR", label: "INR — Indian Rupee" },
  { code: "AED", label: "AED — UAE Dirham" },
] as const;

export const DEFAULT_COUNTRY: SupportedCountryCode = "IN";
export const DEFAULT_CURRENCY: SupportedCurrencyCode = "INR";

export function isSupportedCountry(
  value: string | null | undefined,
): value is SupportedCountryCode {
  return (
    typeof value === "string" &&
    (SUPPORTED_COUNTRIES as readonly string[]).includes(value.toUpperCase())
  );
}

export function isSupportedCurrency(
  value: string | null | undefined,
): value is SupportedCurrencyCode {
  return (
    typeof value === "string" &&
    (SUPPORTED_CURRENCIES as readonly string[]).includes(value.toUpperCase())
  );
}

export function currencyForCountry(
  countryCode: string | null | undefined,
): SupportedCurrencyCode {
  const code = normalizeCountryCode(countryCode);
  return COUNTRY_CURRENCY[code];
}

export function normalizeCountryCode(
  value: string | null | undefined,
): SupportedCountryCode {
  const code = (value ?? DEFAULT_COUNTRY).trim().toUpperCase();
  return isSupportedCountry(code) ? code : DEFAULT_COUNTRY;
}

export function normalizeCurrencyCode(
  value: string | null | undefined,
): SupportedCurrencyCode {
  const code = (value ?? DEFAULT_CURRENCY).trim().toUpperCase();
  return isSupportedCurrency(code) ? code : DEFAULT_CURRENCY;
}

/**
 * Guess country from browser timezone / language.
 * Only India and UAE are supported for now.
 */
export function detectCountryFromBrowser(): SupportedCountryCode {
  if (typeof window === "undefined") {
    return DEFAULT_COUNTRY;
  }

  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    const fromTz = countryFromTimeZone(timeZone);
    if (fromTz) {
      return fromTz;
    }
  } catch {
    // ignore
  }

  try {
    const language = navigator.language || "";
    const region = language.split("-")[1]?.toUpperCase();
    if (isSupportedCountry(region)) {
      return region;
    }
  } catch {
    // ignore
  }

  return DEFAULT_COUNTRY;
}

function countryFromTimeZone(timeZone: string): SupportedCountryCode | null {
  const map: Record<string, SupportedCountryCode> = {
    "Asia/Kolkata": "IN",
    "Asia/Calcutta": "IN",
    "Asia/Dubai": "AE",
  };

  return map[timeZone] ?? null;
}

export function localeForLanguage(language: AppLanguage): string {
  switch (language) {
    case "ta":
      return "ta-IN";
    case "ar":
      return "ar";
    case "hi":
      return "hi-IN";
    default:
      return "en-IN";
  }
}

export function localeForCurrency(
  currencyCode: string,
  language: AppLanguage = DEFAULT_LANGUAGE,
): string {
  const currency = normalizeCurrencyCode(currencyCode);
  if (currency === "AED") {
    return language === "ar" ? "ar-AE" : "en-AE";
  }
  return language === "en" ? "en-IN" : localeForLanguage(language);
}
