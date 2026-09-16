"use client";

import { AIFloatingChat } from "@/components/ai/ai-floating-chat";
import { ClientRouteGuard } from "@/components/permissions/client-route-guard";
import { Can } from "@/components/permissions/can";
import { AppTour } from "@/components/onboarding/app-tour";
import { TourHighlightProvider } from "@/components/onboarding/tour-highlight-context";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { cn } from "@/lib/utils";
import type { OrganizationRole } from "@/lib/permissions/roles";
import type { ReactNode } from "react";

export function DashboardShell({
  businessName,
  userName,
  role,
  userId,
  children,
}: {
  businessName?: string | null;
  userName?: string | null;
  role?: OrganizationRole | null;
  userId?: string;
  children: ReactNode;
}) {
  const { collapsed, toggleCollapsed } = useSidebarCollapsed();

  return (
    <TourHighlightProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-stone-100">
        <Sidebar
          businessName={businessName}
          userName={userName}
          role={role}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
        />
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col transition-[padding] duration-200",
            collapsed ? "lg:pl-16" : "lg:pl-64",
          )}
        >
          <Header businessName={businessName} userName={userName} role={role} />
          <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6">
            <ClientRouteGuard>{children}</ClientRouteGuard>
          </main>
        </div>
        <AppTour userId={userId} />
        <Can permission="ai.use">
          <AIFloatingChat />
        </Can>
      </div>
    </TourHighlightProvider>
  );
}
