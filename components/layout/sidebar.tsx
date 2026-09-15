"use client";

import { signOut } from "@/app/(auth)/actions";
import { LogoutButton } from "@/components/auth/logout-button";
import { Logo } from "@/components/layout/logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useDisclosure } from "@/hooks/use-disclosure";
import { requestJson } from "@/lib/api/client";
import { useLocale } from "@/lib/i18n/locale-context";
import { cn, getInitials } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Building2,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const navItemDefs: {
  href: string;
  labelKey:
    | "nav.dashboard"
    | "nav.ai"
    | "nav.projects"
    | "nav.quotations"
    | "nav.workers"
    | "nav.materials"
    | "nav.vendors"
    | "nav.account"
    | "nav.settings";
  icon: LucideIcon;
}[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/ai", labelKey: "nav.ai", icon: Bot },
  { href: "/projects", labelKey: "nav.projects", icon: FolderKanban },
  { href: "/quotations", labelKey: "nav.quotations", icon: ClipboardList },
  { href: "/workers", labelKey: "nav.workers", icon: Users },
  { href: "/materials", labelKey: "nav.materials", icon: Package },
  { href: "/vendors", labelKey: "nav.vendors", icon: Building2 },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
  { href: "/account", labelKey: "nav.account", icon: UserRound },
];

function SidebarTooltip({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute top-1/2 left-full z-[60] ml-2 hidden -translate-y-1/2 rounded-md bg-stone-800 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg ring-1 ring-stone-700 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 lg:block"
    >
      {label}
    </span>
  );
}

function NavBadge({
  count,
  collapsed,
  active,
}: {
  count: number;
  collapsed?: boolean;
  active?: boolean;
}) {
  if (count <= 0) {
    return null;
  }

  const label = count > 99 ? "99+" : String(count);

  if (collapsed) {
    return (
      <span
        className={cn(
          "absolute top-1 right-1 hidden h-2 w-2 rounded-full bg-amber-400 ring-2 lg:block",
          active ? "ring-stone-800" : "ring-stone-950",
        )}
        aria-hidden
      />
    );
  }

  return (
    <span
      className={cn(
        "ml-auto inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
        active
          ? "bg-amber-400 text-stone-950"
          : "bg-amber-500/90 text-stone-950",
      )}
    >
      {label}
    </span>
  );
}

function useWaitingReceiveCount() {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    const result = await requestJson<{
      receiveMaterialPending: number;
    }>("/api/project-actions/summary", { notify: false });

    if (!result.ok) {
      return;
    }

    setCount(result.data.receiveMaterialPending ?? 0);
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, 45_000);

    function onFocus() {
      void refresh();
    }

    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    if (pathname.startsWith("/projects") || pathname.startsWith("/dashboard")) {
      void refresh();
    }
  }, [pathname, refresh]);

  return count;
}

function NavLinks({
  onNavigate,
  className,
  collapsed,
}: {
  onNavigate?: () => void;
  className?: string;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const { t } = useLocale();
  const waitingReceiveCount = useWaitingReceiveCount();

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {navItemDefs.map((item) => {
        const label = t(item.labelKey);
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        const showReceiveBadge =
          item.href === "/projects" && waitingReceiveCount > 0;
        const badgeLabel = showReceiveBadge
          ? `${waitingReceiveCount} waiting to receive stock`
          : label;

        return (
          <div key={item.href} className="group relative">
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-label={badgeLabel}
              title={showReceiveBadge ? badgeLabel : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                collapsed && "lg:justify-center lg:gap-0 lg:px-2 lg:py-2.5",
                isActive
                  ? "bg-stone-800 text-white"
                  : "text-stone-300 hover:bg-stone-800/70 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span className={cn(collapsed && "lg:hidden")}>{label}</span>
              {showReceiveBadge ? (
                <NavBadge
                  count={waitingReceiveCount}
                  collapsed={collapsed}
                  active={isActive}
                />
              ) : null}
            </Link>
            {collapsed ? (
              <SidebarTooltip
                label={
                  showReceiveBadge
                    ? `Projects · ${waitingReceiveCount} waiting to receive`
                    : label
                }
              />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar({
  collapsed = false,
  onToggleCollapsed,
  businessName,
  userName,
}: {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  businessName?: string | null;
  userName?: string | null;
}) {
  const { isOpen, toggle, close } = useDisclosure();
  const { t } = useLocale();
  const expandLabel = t("nav.expandSidebar");
  const collapseLabel = t("nav.collapseSidebar");
  const signOutLabel = t("nav.signOut");

  return (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <Logo href="/dashboard" />
          {businessName ? (
            <span className="truncate text-sm font-medium text-stone-700">
              {businessName}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-900 text-xs font-semibold text-white">
            {getInitials(userName)}
          </div>
          <button
            type="button"
            onClick={toggle}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-700"
            aria-expanded={isOpen}
            aria-label="Toggle navigation"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </div>

      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-stone-950/40 lg:hidden"
          onClick={close}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen flex-col bg-stone-950 text-white transition-[width,transform,padding] duration-200",
          "w-64 p-5",
          collapsed ? "lg:w-16 lg:overflow-visible lg:p-2" : "lg:w-64 lg:p-5",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div
          className={cn(
            "mb-6 flex shrink-0 items-center justify-between gap-2",
            collapsed && "lg:mb-4 lg:flex-col lg:justify-start",
          )}
        >
          <Logo
            href="/dashboard"
            light
            compact={collapsed}
            className={cn(collapsed && "lg:mb-0")}
          />
          {onToggleCollapsed ? (
            <div className="group relative hidden lg:block">
              <button
                type="button"
                onClick={onToggleCollapsed}
                className={cn(
                  "inline-flex rounded-md p-2 text-stone-300 transition-colors hover:bg-stone-800 hover:text-white",
                  collapsed && "w-full justify-center",
                )}
                aria-label={collapsed ? expandLabel : collapseLabel}
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} />
                ) : (
                  <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
                )}
              </button>
              {collapsed ? <SidebarTooltip label={expandLabel} /> : null}
            </div>
          ) : null}
        </div>

        <NavLinks
          onNavigate={close}
          collapsed={collapsed}
          className={cn(
            "min-h-0 flex-1",
            collapsed ? "lg:overflow-visible" : "overflow-y-auto",
          )}
        />

        <div
          className={cn(
            "mt-auto shrink-0 pt-4",
            collapsed && "lg:flex lg:justify-center",
          )}
        >
          {collapsed ? (
            <div className="group relative hidden lg:block">
              <form action={signOut}>
                <button
                  type="submit"
                  aria-label={signOutLabel}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-stone-700 text-stone-300 hover:bg-stone-800 hover:text-white"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </button>
              </form>
              <SidebarTooltip label={signOutLabel} />
            </div>
          ) : null}
          <div className={cn(collapsed && "lg:hidden")}>
            <LogoutButton />
          </div>
        </div>
      </aside>
    </>
  );
}
