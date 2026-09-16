"use client";

import {
  ACCESS_MATRIX,
  GUIDE_ROLES,
  ROLE_ACCESS_GUIDES,
} from "@/lib/permissions/role-guide";
import { useLocale } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Info, X } from "lucide-react";
import { useState } from "react";

function AccessCell({ allowed }: { allowed: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded-full",
        allowed ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-400",
      )}
      aria-label={allowed ? "Allowed" : "Not allowed"}
    >
      {allowed ? (
        <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
      ) : (
        <X className="h-3 w-3" strokeWidth={2.5} aria-hidden />
      )}
    </span>
  );
}

export function RoleAccessGuide({ compact = false }: { compact?: boolean }) {
  const { t } = useLocale();
  const [expandedRole, setExpandedRole] = useState<string | null>("owner");

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
        <p className="text-xs leading-5 text-amber-900 sm:text-sm">
          {t("settings.roleGuideSubtitle")}
        </p>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
          {t("settings.roleGuideTitle")}
        </h4>
        <div className="divide-y divide-stone-200 rounded-lg border border-stone-200">
          {ROLE_ACCESS_GUIDES.map((guide) => {
            const isOpen = expandedRole === guide.role;

            return (
              <div key={guide.role}>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedRole(isOpen ? null : guide.role)
                  }
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-stone-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-900">
                      {t(`roles.${guide.role}` as MessageKey)}
                    </p>
                    <p className="truncate text-xs text-stone-500">
                      {guide.summary}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-stone-400 transition-transform",
                      isOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>

                {isOpen ? (
                  <div className="space-y-3 border-t border-stone-100 bg-stone-50/60 px-3 py-2.5">
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-emerald-700 uppercase">
                        Can access
                      </p>
                      <ul className="space-y-1.5">
                        {guide.can.map((item) => (
                          <li
                            key={item}
                            className="flex items-start gap-2 text-xs leading-5 text-stone-600"
                          >
                            <Check
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
                              strokeWidth={2.5}
                              aria-hidden
                            />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {guide.cannot.length > 0 ? (
                      <div>
                        <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-stone-500 uppercase">
                          Cannot access
                        </p>
                        <ul className="space-y-1.5">
                          {guide.cannot.map((item) => (
                            <li
                              key={item}
                              className="flex items-start gap-2 text-xs leading-5 text-stone-600"
                            >
                              <X
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400"
                                strokeWidth={2.5}
                                aria-hidden
                              />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
          Access matrix
        </h4>
        <div className="overflow-x-auto rounded-lg border border-stone-200">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-3 py-2 font-medium">Capability</th>
                {GUIDE_ROLES.map((role) => (
                  <th
                    key={role}
                    className="px-2 py-2 text-center font-medium whitespace-nowrap"
                  >
                    {t(`roles.${role}` as MessageKey)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {ACCESS_MATRIX.map((row) => (
                <tr key={row.label} className="hover:bg-stone-50/60">
                  <td className="px-3 py-2 font-medium text-stone-700">
                    {row.label}
                  </td>
                  {GUIDE_ROLES.map((role) => (
                    <td key={role} className="px-2 py-2 text-center">
                      <AccessCell allowed={row.access[role]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
