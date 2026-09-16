"use client";

import { useLocale } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  Bot,
  Building2,
  Calculator,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Package,
  Settings,
  Share2,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { usePathname } from "next/navigation";

type TitleConfig = {
  titleKey: MessageKey;
  icon: LucideIcon;
};

function getTitleConfig(pathname: string): TitleConfig {
  if (pathname === "/projects/new") {
    return { titleKey: "pages.projectsNew", icon: FolderKanban };
  }

  if (/^\/projects\/[^/]+\/reports\/new$/.test(pathname)) {
    return { titleKey: "pages.dailyReportNew", icon: FileText };
  }

  if (/^\/projects\/[^/]+\/reports\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: "pages.dailyReportEdit", icon: FileText };
  }

  if (/^\/projects\/[^/]+\/reports\/[^/]+$/.test(pathname)) {
    return { titleKey: "pages.dailyReport", icon: FileText };
  }

  if (/^\/projects\/[^/]+\/reports$/.test(pathname)) {
    return { titleKey: "pages.dailyReports", icon: CalendarDays };
  }

  if (/^\/projects\/[^/]+\/labour\/attendance$/.test(pathname)) {
    return { titleKey: "pages.attendance", icon: CalendarDays };
  }

  if (/^\/projects\/[^/]+\/labour$/.test(pathname)) {
    return { titleKey: "pages.labour", icon: Users };
  }

  if (/^\/projects\/[^/]+\/materials$/.test(pathname)) {
    return { titleKey: "pages.materials", icon: Package };
  }

  if (/^\/projects\/[^/]+\/expenses\/new$/.test(pathname)) {
    return { titleKey: "pages.expenseNew", icon: Wallet };
  }

  if (/^\/projects\/[^/]+\/expenses\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: "pages.expenseEdit", icon: Wallet };
  }

  if (/^\/projects\/[^/]+\/expenses\/[^/]+$/.test(pathname)) {
    return { titleKey: "pages.expense", icon: Wallet };
  }

  if (/^\/projects\/[^/]+\/expenses$/.test(pathname)) {
    return { titleKey: "pages.expenses", icon: Wallet };
  }

  if (/^\/projects\/[^/]+\/quotations\/new$/.test(pathname)) {
    return { titleKey: "pages.quotationNew", icon: ClipboardList };
  }

  if (/^\/projects\/[^/]+\/quotations$/.test(pathname)) {
    return { titleKey: "pages.quotations", icon: ClipboardList };
  }

  if (/^\/projects\/[^/]+\/boq/.test(pathname)) {
    return { titleKey: "pages.boq", icon: Calculator };
  }

  if (/^\/projects\/[^/]+\/client-portal$/.test(pathname)) {
    return { titleKey: "pages.clientPortal", icon: Share2 };
  }

  if (/^\/projects\/[^/]+\/documents$/.test(pathname)) {
    return { titleKey: "pages.documents", icon: FileText };
  }

  if (/^\/projects\/[^/]+\/ai$/.test(pathname) || pathname === "/ai") {
    return { titleKey: "pages.ai", icon: Bot };
  }

  if (/^\/projects\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: "pages.projectsEdit", icon: FolderKanban };
  }

  if (/^\/projects\/[^/]+$/.test(pathname)) {
    return { titleKey: "pages.projectsOverview", icon: LayoutDashboard };
  }

  if (pathname === "/projects" || pathname.startsWith("/projects/")) {
    return { titleKey: "pages.projects", icon: FolderKanban };
  }

  if (pathname === "/workers/new") {
    return { titleKey: "pages.workersNew", icon: Users };
  }

  if (/^\/workers\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: "pages.workersEdit", icon: Users };
  }

  if (/^\/workers\/[^/]+$/.test(pathname)) {
    return { titleKey: "pages.worker", icon: Users };
  }

  if (pathname === "/workers" || pathname.startsWith("/workers/")) {
    return { titleKey: "pages.workers", icon: Users };
  }

  if (pathname === "/materials/new") {
    return { titleKey: "pages.materialsNew", icon: Package };
  }

  if (/^\/materials\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: "pages.materialsEdit", icon: Package };
  }

  if (/^\/materials\/[^/]+$/.test(pathname)) {
    return { titleKey: "pages.material", icon: Package };
  }

  if (pathname === "/materials" || pathname.startsWith("/materials/")) {
    return { titleKey: "pages.materials", icon: Package };
  }

  if (pathname === "/vendors/new") {
    return { titleKey: "pages.vendorsNew", icon: Building2 };
  }

  if (/^\/vendors\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: "pages.vendorsEdit", icon: Building2 };
  }

  if (/^\/vendors\/[^/]+$/.test(pathname)) {
    return { titleKey: "pages.vendor", icon: Building2 };
  }

  if (pathname === "/vendors" || pathname.startsWith("/vendors/")) {
    return { titleKey: "pages.vendors", icon: Building2 };
  }

  if (pathname === "/quotations/new") {
    return { titleKey: "pages.quotationNew", icon: ClipboardList };
  }

  if (/^\/quotations\/[^/]+\/edit$/.test(pathname)) {
    return { titleKey: "pages.quotationEdit", icon: ClipboardList };
  }

  if (/^\/quotations\/[^/]+$/.test(pathname)) {
    return { titleKey: "pages.quotation", icon: ClipboardList };
  }

  if (pathname === "/quotations" || pathname.startsWith("/quotations/")) {
    return { titleKey: "pages.quotations", icon: ClipboardList };
  }

  if (pathname.startsWith("/settings")) {
    return { titleKey: "pages.settings", icon: Settings };
  }

  if (pathname.startsWith("/account")) {
    return { titleKey: "pages.account", icon: UserRound };
  }

  if (pathname.startsWith("/ai")) {
    return { titleKey: "pages.ai", icon: Bot };
  }

  if (pathname.startsWith("/dashboard")) {
    return { titleKey: "pages.dashboard", icon: LayoutDashboard };
  }

  return { titleKey: "pages.workspace", icon: Archive };
}

export function PageTitle({ className }: { className?: string }) {
  const pathname = usePathname();
  const { t } = useLocale();
  const { titleKey, icon: Icon } = getTitleConfig(pathname);

  return (
    <h1
      className={cn(
        "inline-flex items-center gap-2.5 text-xl font-semibold text-stone-900",
        className,
      )}
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-100">
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </span>
      {t(titleKey)}
    </h1>
  );
}
