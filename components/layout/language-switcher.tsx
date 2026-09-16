"use client";

import { setAppLanguage } from "@/lib/i18n/actions";
import { useTourHighlightActive } from "@/components/onboarding/tour-highlight-context";
import { Select } from "@/components/ui/select";
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
} from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";
import { ChevronDown, Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LanguageSwitcher({
  className,
  variant = "default",
  compact = false,
}: {
  className?: string;
  variant?: "default" | "dark";
  compact?: boolean;
}) {
  const router = useRouter();
  const { language, setLanguage, t } = useLocale();
  const [isPending, startTransition] = useTransition();
  const isDark = variant === "dark";
  const isTourHighlighted = useTourHighlightActive("language-switcher");

  function onChange(nextLanguage: AppLanguage) {
    if (nextLanguage === language) {
      return;
    }

    const previous = language;
    setLanguage(nextLanguage);

    startTransition(async () => {
      const result = await setAppLanguage(nextLanguage);
      if ("error" in result) {
        setLanguage(previous);
        return;
      }
      router.refresh();
    });
  }

  return (
    <label
      className={cn(
        "inline-flex shrink-0",
        isTourHighlighted &&
          "relative z-[102] rounded-md shadow-lg shadow-amber-500/20 ring-2 ring-amber-400 transition-all duration-300",
        className,
      )}
      data-tour="language-switcher"
    >
      <span className="sr-only">{t("common.language")}</span>
      <span className="relative inline-flex items-center">
        <Languages
          className={cn(
            "pointer-events-none absolute z-10 h-3.5 w-3.5",
            compact ? "left-2" : "left-2.5",
            isDark ? "text-stone-300" : "text-stone-500",
          )}
          aria-hidden
        />
        <Select
          aria-label={t("common.language")}
          value={language}
          disabled={isPending}
          onChange={(event) =>
            onChange(event.target.value as AppLanguage)
          }
          className={cn(
            "h-9 appearance-none py-0 text-xs font-medium shadow-sm",
            compact
              ? "w-[4.5rem] pl-7 pr-6"
              : "w-[8.75rem] pl-8 pr-8 sm:w-[9.5rem] sm:text-sm",
            isDark
              ? "border-stone-600 bg-stone-900 text-white focus:border-amber-500 focus:ring-amber-500/20"
              : "border-stone-300 bg-white text-stone-900",
          )}
        >
          {SUPPORTED_LANGUAGES.map((code) => (
            <option key={code} value={code}>
              {compact ? code.toUpperCase() : LANGUAGE_LABELS[code]}
            </option>
          ))}
        </Select>
        <ChevronDown
          className={cn(
            "pointer-events-none absolute h-3.5 w-3.5",
            compact ? "right-1.5" : "right-2",
            isDark ? "text-stone-400" : "text-stone-500",
          )}
          aria-hidden
        />
      </span>
    </label>
  );
}
