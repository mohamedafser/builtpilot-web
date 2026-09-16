"use client";

import { Toaster } from "@/components/ui/toaster";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import { registerPwaServiceWorker } from "@/lib/pwa";
import type { ReactNode } from "react";
import { useEffect } from "react";

export function Providers({
  children,
  language,
  currencyCode,
  countryCode,
}: {
  children: ReactNode;
  language?: string | null;
  currencyCode?: string | null;
  countryCode?: string | null;
}) {
  useEffect(() => {
    registerPwaServiceWorker();
  }, []);

  return (
    <LocaleProvider
      language={language}
      currencyCode={currencyCode}
      countryCode={countryCode}
    >
      {children}
      <Toaster />
    </LocaleProvider>
  );
}
