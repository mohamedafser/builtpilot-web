"use client";

import {
  DEFAULT_CURRENCY,
  DEFAULT_LANGUAGE,
  isRtlLanguage,
  normalizeCountryCode,
  normalizeCurrencyCode,
  normalizeLanguage,
  type AppLanguage,
} from "@/lib/i18n/config";
import { translate, translateWithParams, type MessageKey } from "@/lib/i18n/messages";
import {
  formatMoney as formatMoneyValue,
  setRuntimeLocale,
} from "@/lib/i18n/money";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type LocaleContextValue = {
  language: AppLanguage;
  currencyCode: string;
  countryCode: string;
  dir: "ltr" | "rtl";
  t: (key: MessageKey) => string;
  tParams: (
    key: MessageKey,
    params: Record<string, string | number>,
  ) => string;
  formatMoney: (value: string | number | null) => string;
  setLanguage: (language: AppLanguage) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  language: initialLanguage = DEFAULT_LANGUAGE,
  currencyCode: initialCurrency = DEFAULT_CURRENCY,
  countryCode: initialCountry = "IN",
  children,
}: {
  language?: string | null;
  currencyCode?: string | null;
  countryCode?: string | null;
  children: ReactNode;
}) {
  const [language, setLanguageState] = useState<AppLanguage>(
    normalizeLanguage(initialLanguage),
  );
  const currencyCode = normalizeCurrencyCode(initialCurrency);
  const countryCode = normalizeCountryCode(initialCountry);

  useEffect(() => {
    setLanguageState(normalizeLanguage(initialLanguage));
  }, [initialLanguage]);

  useEffect(() => {
    setRuntimeLocale({ currencyCode, language });
  }, [currencyCode, language]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = isRtlLanguage(language) ? "rtl" : "ltr";
  }, [language]);

  const t = useCallback(
    (key: MessageKey) => translate(language, key),
    [language],
  );

  const tParams = useCallback(
    (key: MessageKey, params: Record<string, string | number>) =>
      translateWithParams(language, key, params),
    [language],
  );

  const formatMoney = useCallback(
    (value: string | number | null) =>
      formatMoneyValue(value, currencyCode, language),
    [currencyCode, language],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      language,
      currencyCode,
      countryCode,
      dir: isRtlLanguage(language) ? "rtl" : "ltr",
      t,
      tParams,
      formatMoney,
      setLanguage: setLanguageState,
    }),
    [language, currencyCode, countryCode, t, tParams, formatMoney],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    return {
      language: DEFAULT_LANGUAGE,
      currencyCode: DEFAULT_CURRENCY,
      countryCode: "IN",
      dir: "ltr" as const,
      t: (key: MessageKey) => translate(DEFAULT_LANGUAGE, key),
      tParams: (
        key: MessageKey,
        params: Record<string, string | number>,
      ) => translateWithParams(DEFAULT_LANGUAGE, key, params),
      formatMoney: (value: string | number | null) =>
        formatMoneyValue(value, DEFAULT_CURRENCY, DEFAULT_LANGUAGE),
      setLanguage: () => undefined,
    };
  }

  return context;
}
