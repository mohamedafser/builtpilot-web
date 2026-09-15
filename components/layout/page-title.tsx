"use client";

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
  title: string;
  icon: LucideIcon;
};

function getTitleConfig(pathname: string): TitleConfig {
  if (pathname === "/projects/new") {
    return { title: "New project", icon: FolderKanban };
  }

  if (/^\/projects\/[^/]+\/reports\/new$/.test(pathname)) {
    return { title: "New daily report", icon: FileText };
  }

  if (/^\/projects\/[^/]+\/reports\/[^/]+\/edit$/.test(pathname)) {
    return { title: "Edit daily report", icon: FileText };
  }

  if (/^\/projects\/[^/]+\/reports\/[^/]+$/.test(pathname)) {
    return { title: "Daily report", icon: FileText };
  }

  if (/^\/projects\/[^/]+\/reports$/.test(pathname)) {
    return { title: "Daily reports", icon: CalendarDays };
  }

  if (/^\/projects\/[^/]+\/labour\/attendance$/.test(pathname)) {
    return { title: "Attendance", icon: CalendarDays };
  }

  if (/^\/projects\/[^/]+\/labour$/.test(pathname)) {
    return { title: "Labour", icon: Users };
  }

  if (/^\/projects\/[^/]+\/materials$/.test(pathname)) {
    return { title: "Materials", icon: Package };
  }

  if (/^\/projects\/[^/]+\/expenses\/new$/.test(pathname)) {
    return { title: "New expense", icon: Wallet };
  }

  if (/^\/projects\/[^/]+\/expenses\/[^/]+\/edit$/.test(pathname)) {
    return { title: "Edit expense", icon: Wallet };
  }

  if (/^\/projects\/[^/]+\/expenses\/[^/]+$/.test(pathname)) {
    return { title: "Expense", icon: Wallet };
  }

  if (/^\/projects\/[^/]+\/expenses$/.test(pathname)) {
    return { title: "Expenses", icon: Wallet };
  }

  if (/^\/projects\/[^/]+\/quotations\/new$/.test(pathname)) {
    return { title: "New quotation", icon: ClipboardList };
  }

  if (/^\/projects\/[^/]+\/quotations$/.test(pathname)) {
    return { title: "Quotations", icon: ClipboardList };
  }

  if (/^\/projects\/[^/]+\/boq/.test(pathname)) {
    return { title: "BOQ", icon: Calculator };
  }

  if (/^\/projects\/[^/]+\/client-portal$/.test(pathname)) {
    return { title: "Client portal", icon: Share2 };
  }

  if (/^\/projects\/[^/]+\/documents$/.test(pathname)) {
    return { title: "Documents", icon: FileText };
  }

  if (/^\/projects\/[^/]+\/ai$/.test(pathname) || pathname === "/ai") {
    return { title: "BuildPilot AI", icon: Bot };
  }

  if (/^\/projects\/[^/]+\/edit$/.test(pathname)) {
    return { title: "Edit project", icon: FolderKanban };
  }

  if (/^\/projects\/[^/]+$/.test(pathname)) {
    return { title: "Overview", icon: LayoutDashboard };
  }

  if (pathname === "/projects" || pathname.startsWith("/projects/")) {
    return { title: "Projects", icon: FolderKanban };
  }

  if (pathname === "/workers/new") {
    return { title: "New worker", icon: Users };
  }

  if (/^\/workers\/[^/]+\/edit$/.test(pathname)) {
    return { title: "Edit worker", icon: Users };
  }

  if (/^\/workers\/[^/]+$/.test(pathname)) {
    return { title: "Worker", icon: Users };
  }

  if (pathname === "/workers" || pathname.startsWith("/workers/")) {
    return { title: "Workers", icon: Users };
  }

  if (pathname === "/materials/new") {
    return { title: "New material", icon: Package };
  }

  if (/^\/materials\/[^/]+\/edit$/.test(pathname)) {
    return { title: "Edit material", icon: Package };
  }

  if (/^\/materials\/[^/]+$/.test(pathname)) {
    return { title: "Material", icon: Package };
  }

  if (pathname === "/materials" || pathname.startsWith("/materials/")) {
    return { title: "Materials", icon: Package };
  }

  if (pathname === "/vendors/new") {
    return { title: "New vendor", icon: Building2 };
  }

  if (/^\/vendors\/[^/]+\/edit$/.test(pathname)) {
    return { title: "Edit vendor", icon: Building2 };
  }

  if (/^\/vendors\/[^/]+$/.test(pathname)) {
    return { title: "Vendor", icon: Building2 };
  }

  if (pathname === "/vendors" || pathname.startsWith("/vendors/")) {
    return { title: "Vendors", icon: Building2 };
  }

  if (pathname === "/quotations/new") {
    return { title: "New quotation", icon: ClipboardList };
  }

  if (/^\/quotations\/[^/]+\/edit$/.test(pathname)) {
    return { title: "Edit quotation", icon: ClipboardList };
  }

  if (/^\/quotations\/[^/]+$/.test(pathname)) {
    return { title: "Quotation", icon: ClipboardList };
  }

  if (pathname === "/quotations" || pathname.startsWith("/quotations/")) {
    return { title: "Quotations", icon: ClipboardList };
  }

  if (pathname.startsWith("/settings")) {
    return { title: "Settings", icon: Settings };
  }

  if (pathname.startsWith("/account")) {
    return { title: "Account", icon: UserRound };
  }

  if (pathname.startsWith("/ai")) {
    return { title: "BuildPilot AI", icon: Bot };
  }

  if (pathname.startsWith("/dashboard")) {
    return { title: "Dashboard", icon: LayoutDashboard };
  }

  return { title: "Workspace", icon: Archive };
}

export function PageTitle({ className }: { className?: string }) {
  const pathname = usePathname();
  const { title, icon: Icon } = getTitleConfig(pathname);

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
      {title}
    </h1>
  );
}
