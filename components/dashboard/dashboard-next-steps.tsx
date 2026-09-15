import { linkButtonClassName } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WithIcon } from "@/components/ui/with-icon";
import type { ProjectActionView } from "@/lib/project-actions/types";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Bell,
  ClipboardList,
  Package,
  Users,
} from "lucide-react";
import Link from "next/link";

const TYPE_ICON = {
  material: Package,
  labour: Users,
  quotation: ClipboardList,
  payment: Bell,
  task: Bell,
  inspection: Bell,
} as const;

export function DashboardNextSteps({
  totalPending,
  projectsWithActions,
  byType,
  actions,
}: {
  totalPending: number;
  projectsWithActions: number;
  byType: Partial<Record<string, number>>;
  actions: ProjectActionView[];
}) {
  if (totalPending <= 0) {
    return null;
  }

  const chips = [
    {
      label: "Materials to receive",
      count: byType.material ?? 0,
      href: "/projects",
    },
    {
      label: "Quotations to review",
      count: byType.quotation ?? 0,
      href: "/quotations",
    },
    {
      label: "Labour to review",
      count: byType.labour ?? 0,
      href: "/projects",
    },
  ].filter((chip) => chip.count > 0);

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-700" aria-hidden />
              <h2 className="text-sm font-semibold text-stone-900">
                Action required
              </h2>
            </div>
            <p className="mt-1 text-xs text-stone-600">
              {totalPending} pending across {projectsWithActions}{" "}
              {projectsWithActions === 1 ? "project" : "projects"}
            </p>
          </div>
          <Link
            href="/projects"
            className={cn(linkButtonClassName("secondary", "sm"), "h-8")}
          >
            <WithIcon icon={ArrowRight}>View projects</WithIcon>
          </Link>
        </div>

        {chips.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <Link
                key={chip.label}
                href={chip.href}
                className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-stone-700 ring-1 ring-amber-200 hover:bg-amber-50"
              >
                {chip.count} {chip.label}
              </Link>
            ))}
          </div>
        ) : null}

        {actions.length > 0 ? (
          <ul className="mt-3 divide-y divide-amber-100 rounded-lg border border-amber-200 bg-white">
            {actions.slice(0, 4).map((action) => {
              const Icon = TYPE_ICON[action.type] ?? Bell;
              return (
                <li key={action.id}>
                  <Link
                    href={action.href ?? `/projects/${action.project_id}`}
                    className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-amber-50/50"
                  >
                    <Icon
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700"
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-stone-900">
                        {action.title}
                      </span>
                      <span className="block text-xs text-stone-500">
                        {action.project_name ?? "Project"}
                        {action.description ? ` · ${action.description}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
