"use client";

import { requestJson } from "@/lib/api/client";
import type { ProjectActionView } from "@/lib/project-actions/types";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Calculator,
  ClipboardList,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Package,
  Share2,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const sections: {
  key: string;
  label: string;
  icon: LucideIcon;
  href: (id: string) => string;
  badgeType?: "material" | "labour" | "quotation";
}[] = [
  {
    key: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    href: (id) => `/projects/${id}`,
  },
  {
    key: "reports",
    label: "Daily reports",
    icon: FileText,
    href: (id) => `/projects/${id}/reports`,
  },
  {
    key: "labour",
    label: "Labour",
    icon: Users,
    href: (id) => `/projects/${id}/labour`,
    badgeType: "labour",
  },
  {
    key: "materials",
    label: "Materials",
    icon: Package,
    href: (id) => `/projects/${id}/materials`,
    badgeType: "material",
  },
  {
    key: "expenses",
    label: "Expenses",
    icon: Wallet,
    href: (id) => `/projects/${id}/expenses`,
  },
  {
    key: "quotations",
    label: "Quotations",
    icon: ClipboardList,
    href: (id) => `/projects/${id}/quotations`,
    badgeType: "quotation",
  },
  {
    key: "boq",
    label: "BOQ",
    icon: Calculator,
    href: (id) => `/projects/${id}/boq`,
  },
  {
    key: "client-portal",
    label: "Client portal",
    icon: Share2,
    href: (id) => `/projects/${id}/client-portal`,
  },
  {
    key: "documents",
    label: "Documents",
    icon: FolderOpen,
    href: (id) => `/projects/${id}/documents`,
  },
  {
    key: "ai",
    label: "AI",
    icon: Bot,
    href: (id) => `/projects/${id}/ai`,
  },
];

const BADGE_LABELS: Record<"material" | "labour" | "quotation", string> = {
  material: "waiting to receive",
  labour: "waiting for attendance",
  quotation: "needs review",
};

function isSectionActive(pathname: string, projectId: string, key: string) {
  if (key === "overview") {
    return (
      pathname === `/projects/${projectId}` ||
      pathname === `/projects/${projectId}/edit`
    );
  }

  return pathname.startsWith(`/projects/${projectId}/${key}`);
}

function SectionBadge({
  count,
  active,
}: {
  count: number;
  active: boolean;
}) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex min-w-4 items-center justify-center rounded-full px-1 py-0.5 text-[10px] font-semibold leading-none tabular-nums",
        active
          ? "bg-amber-400 text-stone-950"
          : "bg-amber-100 text-amber-900",
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function useProjectSectionBadges(projectId: string) {
  const pathname = usePathname();
  const [counts, setCounts] = useState({
    material: 0,
    labour: 0,
    quotation: 0,
  });

  const refresh = useCallback(async () => {
    const result = await requestJson<{
      actions: ProjectActionView[];
    }>(`/api/projects/${projectId}/actions?status=pending`, {
      notify: false,
    });

    if (!result.ok) {
      return;
    }

    const next = { material: 0, labour: 0, quotation: 0 };
    for (const action of result.data.actions) {
      if (action.type === "material") next.material += 1;
      if (action.type === "labour") next.labour += 1;
      if (action.type === "quotation") next.quotation += 1;
    }
    setCounts(next);
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    function onFocus() {
      void refresh();
    }

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return counts;
}

export function ProjectSectionNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const badges = useProjectSectionBadges(projectId);

  const badgeTitles = useMemo(
    () => ({
      material:
        badges.material > 0
          ? `${badges.material} ${BADGE_LABELS.material}`
          : undefined,
      labour:
        badges.labour > 0
          ? `${badges.labour} ${BADGE_LABELS.labour}`
          : undefined,
      quotation:
        badges.quotation > 0
          ? `${badges.quotation} ${BADGE_LABELS.quotation}`
          : undefined,
    }),
    [badges],
  );

  return (
    <nav
      aria-label="Project sections"
      className="sticky top-0 z-20 -mx-4 mb-4 bg-stone-100/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-stone-100/80 sm:-mx-6 sm:px-6"
    >
      <div className="-mx-1 overflow-x-auto px-1">
        <ul className="flex min-w-max gap-1 rounded-lg border border-stone-200 bg-white p-1 shadow-sm">
          {sections.map((section) => {
            const href = section.href(projectId);
            const active = isSectionActive(pathname, projectId, section.key);
            const Icon = section.icon;
            const badgeCount = section.badgeType
              ? badges[section.badgeType]
              : 0;
            const badgeTitle = section.badgeType
              ? badgeTitles[section.badgeType]
              : undefined;

            return (
              <li key={section.key}>
                <Link
                  href={href}
                  title={badgeTitle}
                  aria-label={
                    badgeTitle
                      ? `${section.label} · ${badgeTitle}`
                      : section.label
                  }
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium whitespace-nowrap",
                    active
                      ? "bg-stone-900 text-white"
                      : badgeCount > 0
                        ? "bg-amber-50 text-amber-950 hover:bg-amber-100"
                        : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
                  )}
                >
                  <Icon
                    className="h-3.5 w-3.5 shrink-0"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span className="hidden sm:inline">{section.label}</span>
                  <span className="sm:hidden">
                    {section.label.split(" ")[0]}
                  </span>
                  <SectionBadge count={badgeCount} active={active} />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
