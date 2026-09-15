import {
  DEFAULT_CURRENCY,
  DEFAULT_LANGUAGE,
  localeForCurrency,
  normalizeCurrencyCode,
  normalizeLanguage,
  type AppLanguage,
} from "@/lib/i18n/config";

/** Client runtime defaults set by LocaleProvider so shared formatters pick up business currency. */
let runtimeCurrency = DEFAULT_CURRENCY;
let runtimeLanguage: AppLanguage = DEFAULT_LANGUAGE;

export function setRuntimeLocale(options: {
  currencyCode?: string | null;
  language?: string | null;
}) {
  if (options.currencyCode !== undefined) {
    runtimeCurrency = normalizeCurrencyCode(options.currencyCode);
  }
  if (options.language !== undefined) {
    runtimeLanguage = normalizeLanguage(options.language);
  }
}

export function getRuntimeCurrency(): string {
  return runtimeCurrency;
}

export function getRuntimeLanguage(): AppLanguage {
  return runtimeLanguage;
}

export function formatMoney(
  value: string | number | null,
  currencyCode?: string | null,
  language?: AppLanguage | null,
): string {
  if (value === null || value === "") {
    return "—";
  }

  const amount = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  const currency = normalizeCurrencyCode(currencyCode ?? runtimeCurrency);
  const lang = normalizeLanguage(language ?? runtimeLanguage);

  return new Intl.NumberFormat(localeForCurrency(currency, lang), {
    style: "currency",
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
