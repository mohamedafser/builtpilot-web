import { PageTitle } from "@/components/layout/page-title";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { getInitials } from "@/lib/utils";

export function Header({
  businessName,
  userName,
}: {
  businessName?: string | null;
  userName?: string | null;
}) {
  return (
    <header className="flex shrink-0 flex-col gap-3 border-b border-stone-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <PageTitle />
        {businessName ? (
          <p className="mt-0.5 hidden text-sm text-stone-500 lg:block">
            {businessName}
          </p>
        ) : null}
      </div>
      <div className="hidden items-center gap-3 lg:flex">
        <NotificationBell />
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-900 text-xs font-semibold text-white">
          {getInitials(userName)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-stone-800">
            {userName ?? "BuildPilot user"}
          </p>
          <p className="text-xs text-stone-500">Workspace member</p>
        </div>
      </div>
    </header>
  );
}
