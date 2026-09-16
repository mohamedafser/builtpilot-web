"use client";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { PageTitle } from "@/components/layout/page-title";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useLocale } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import type { OrganizationRole } from "@/lib/permissions/roles";
import { getInitials } from "@/lib/utils";

function roleLabel(
  t: (key: MessageKey) => string,
  role: OrganizationRole,
): string {
  return t(`roles.${role}` as MessageKey);
}

export function Header({
  businessName,
  userName,
  role,
}: {
  businessName?: string | null;
  userName?: string | null;
  role?: OrganizationRole | null;
}) {
  const { t } = useLocale();

  return (
    <header className="flex shrink-0 flex-col gap-3 border-b border-stone-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0 flex-1">
        <PageTitle />
        {businessName ? (
          <p className="mt-0.5 hidden text-sm text-stone-500 lg:block">
            {t("header.organization")}: {businessName}
            {role ? (
              <>
                {" "}
                · {t("header.role")}: {roleLabel(t, role)}
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <LanguageSwitcher className="hidden lg:inline-flex" />

        <div className="hidden items-center gap-3 lg:flex">
          <NotificationBell />
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-900 text-xs font-semibold text-white">
            {getInitials(userName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-stone-800">
              {userName ?? t("header.userFallback")}
            </p>
            <p className="text-xs text-stone-500">
              {role ? roleLabel(t, role) : t("header.workspaceMember")}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
