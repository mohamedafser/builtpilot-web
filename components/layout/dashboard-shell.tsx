"use client";

import { AIFloatingChat } from "@/components/ai/ai-floating-chat";
import { AppTour } from "@/components/onboarding/app-tour";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function DashboardShell({
  businessName,
  userName,
  children,
}: {
  businessName?: string | null;
  userName?: string | null;
  children: ReactNode;
}) {
  const { collapsed, toggleCollapsed } = useSidebarCollapsed();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-stone-100">
      <Sidebar
        businessName={businessName}
        userName={userName}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col transition-[padding] duration-200",
          collapsed ? "lg:pl-16" : "lg:pl-64",
        )}
      >
        <Header businessName={businessName} userName={userName} />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
      <AppTour />
      <AIFloatingChat />
    </div>
  );
}
