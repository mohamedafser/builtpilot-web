"use client";

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

const sections: {
  key: string;
  label: string;
  icon: LucideIcon;
  href: (id: string) => string;
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
  },
  {
    key: "materials",
    label: "Materials",
    icon: Package,
    href: (id) => `/projects/${id}/materials`,
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

function isSectionActive(pathname: string, projectId: string, key: string) {
  if (key === "overview") {
    return (
      pathname === `/projects/${projectId}` ||
      pathname === `/projects/${projectId}/edit`
    );
  }

  return pathname.startsWith(`/projects/${projectId}/${key}`);
}

export function ProjectSectionNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();

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

            return (
              <li key={section.key}>
                <Link
                  href={href}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium whitespace-nowrap",
                    active
                      ? "bg-stone-900 text-white"
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
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
