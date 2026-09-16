"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";
import { Building2, Shield, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";

export type SettingsTabId = "organization" | "team" | "preferences";

const tabDefs: {
  id: SettingsTabId;
  labelKey: MessageKey;
  icon: typeof Building2;
}[] = [
  { id: "organization", labelKey: "settings.tabOrganization", icon: Building2 },
  { id: "team", labelKey: "settings.tabTeam", icon: Shield },
  { id: "preferences", labelKey: "settings.tabPreferences", icon: UserRound },
];

export function SettingsTabs({
  showTeam,
  organization,
  team,
  preferences,
  defaultTab = "organization",
}: {
  showTeam: boolean;
  organization: ReactNode;
  team: ReactNode;
  preferences: ReactNode;
  defaultTab?: SettingsTabId;
}) {
  const { t } = useLocale();
  const visibleTabs = showTeam
    ? tabDefs
    : tabDefs.filter((tab) => tab.id !== "team");
  const [activeTab, setActiveTab] = useState<SettingsTabId>(
    visibleTabs.some((tab) => tab.id === defaultTab)
      ? defaultTab
      : visibleTabs[0]?.id ?? "preferences",
  );

  const panels: Record<SettingsTabId, ReactNode> = {
    organization,
    team,
    preferences,
  };

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 bg-stone-50/80 px-2 pt-2 sm:px-3">
        <div className="flex gap-1 overflow-x-auto">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border border-b-white border-stone-200 bg-white text-stone-900"
                    : "text-stone-500 hover:bg-white/70 hover:text-stone-800",
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                {t(tab.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 sm:p-5">{panels[activeTab]}</div>
    </div>
  );
}
