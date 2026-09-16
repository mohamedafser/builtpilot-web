"use client";

import {
  Building2,
  ClipboardList,
  FileText,
  Sparkles,
  Users,
} from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

const orbitIcons = [
  {
    icon: Building2,
    label: "Projects",
    className: "landing-orbit-1 left-[3%] top-[6%] sm:left-[8%] sm:top-[12%]",
  },
  {
    icon: ClipboardList,
    label: "BOQ",
    className: "landing-orbit-2 right-[3%] top-[10%] sm:right-[6%] sm:top-[18%]",
  },
  {
    icon: Users,
    label: "Team",
    className:
      "landing-orbit-3 left-[2%] bottom-[12%] sm:left-[4%] sm:bottom-[22%]",
  },
  {
    icon: FileText,
    label: "Quotes",
    className:
      "landing-orbit-4 right-[3%] bottom-[8%] sm:right-[10%] sm:bottom-[16%]",
  },
];

const showcaseStats: { labelKey: MessageKey; value: string }[] = [
  { labelKey: "landing.showcaseProjects", value: "12" },
  { labelKey: "landing.showcaseTeam", value: "08" },
  { labelKey: "landing.showcaseQuotes", value: "05" },
];

export function AnimatedShowcase() {
  const { t } = useLocale();

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[18.5rem] sm:max-w-md">
      <div className="landing-showcase-glow absolute inset-8 rounded-full bg-amber-300/25 blur-3xl" />

      <div className="landing-showcase-ring absolute inset-4 rounded-[1.5rem] border border-dashed border-amber-300/40 sm:inset-6 sm:rounded-[2rem]" />
      <div className="landing-showcase-ring landing-showcase-ring-reverse absolute inset-9 rounded-[1.25rem] border border-stone-300/50 sm:inset-12 sm:rounded-[1.75rem]" />

      {orbitIcons.map(({ icon: Icon, label, className }) => (
        <div
          key={label}
          className={cn(
            "landing-orbit-icon absolute z-10 flex flex-col items-center gap-1 sm:gap-1.5",
            className,
          )}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-amber-700 shadow-[0_16px_40px_-24px_rgba(28,25,23,0.45)] sm:h-14 sm:w-14 sm:rounded-2xl">
            <Icon className="h-4 w-4 sm:h-6 sm:w-6" />
          </div>
          <span className="hidden rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-stone-600 uppercase ring-1 ring-stone-200/80 sm:inline-block">
            {label}
          </span>
        </div>
      ))}

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="landing-showcase-core relative z-20 w-[min(54%,10.5rem)] overflow-hidden rounded-[1.35rem] border border-stone-200/80 bg-white p-3.5 shadow-[0_28px_60px_-28px_rgba(28,25,23,0.45)] sm:w-[min(72%,14rem)] sm:rounded-[1.75rem] sm:p-6">
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-amber-50 to-transparent sm:h-20" />
          <div className="relative flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-[0_12px_24px_-12px_rgba(234,88,12,0.65)] sm:h-11 sm:w-11 sm:rounded-2xl">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold tracking-[0.16em] text-stone-500 uppercase sm:text-[10px]">
                BuildPilot
              </p>
              <p className="truncate text-sm font-semibold text-stone-900 sm:text-base">
                Project workspace
              </p>
            </div>
          </div>

          <div className="relative mt-3.5 space-y-2 sm:mt-5 sm:space-y-2.5">
            {showcaseStats.map((item, index) => (
              <div
                key={item.labelKey}
                className={cn(
                  "landing-showcase-stat flex items-center justify-between rounded-lg border border-stone-200/80 bg-stone-50/80 px-2.5 py-2 sm:rounded-xl sm:px-3 sm:py-2.5",
                  index === 1 && "landing-showcase-stat-delay-1",
                  index === 2 && "landing-showcase-stat-delay-2",
                )}
              >
                <span className="text-[11px] text-stone-600 sm:text-xs">
                  {t(item.labelKey)}
                </span>
                <span className="text-xs font-bold text-stone-900 sm:text-sm">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
