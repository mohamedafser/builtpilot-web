"use client";

import { Alert } from "@/components/ui/alert";
import { Button, linkButtonClassName } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WithIcon } from "@/components/ui/with-icon";
import { requestJson } from "@/lib/api/client";
import { invalidateApiCache } from "@/lib/api/client-cache";
import type { ProjectActionView } from "@/lib/project-actions/types";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ClipboardList,
  Package,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

const TYPE_ICON = {
  material: Package,
  labour: Users,
  quotation: ClipboardList,
  payment: Bell,
  task: Bell,
  inspection: Bell,
} as const;

function ActionRow({
  action,
  onResolved,
}: {
  action: ProjectActionView;
  onResolved: (id: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const Icon = TYPE_ICON[action.type] ?? Bell;

  function dismiss() {
    startTransition(async () => {
      const result = await requestJson<{ action: ProjectActionView | null }>(
        `/api/project-actions/${action.id}/complete`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "dismissed" }),
        },
      );

      if (!result.ok) {
        return;
      }

      invalidateApiCache();
      onResolved(action.id);
    });
  }

  return (
    <li className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-amber-700 ring-1 ring-amber-200">
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-stone-900">{action.title}</p>
          {action.description ? (
            <p className="mt-0.5 text-xs text-stone-600">{action.description}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {action.href ? (
              <Link
                href={action.href}
                className={cn(linkButtonClassName("primary", "sm"), "h-8")}
              >
                <WithIcon icon={ArrowRight}>{action.cta_label}</WithIcon>
              </Link>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-stone-600"
              disabled={isPending}
              onClick={dismiss}
            >
              {isPending ? "Updating..." : "Dismiss"}
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}

export function ProjectNextSteps({
  projectId,
  compact = false,
}: {
  projectId: string;
  compact?: boolean;
}) {
  const [actions, setActions] = useState<ProjectActionView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await requestJson<{
      actions: ProjectActionView[];
      pendingCount: number;
    }>(`/api/projects/${projectId}/actions?status=pending`, { notify: false });

    if (!result.ok) {
      setError(result.message);
      setActions([]);
      setIsLoading(false);
      return;
    }

    setActions(result.data.actions);
    setIsLoading(false);
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (actions.length === 0) {
    if (compact) {
      return null;
    }

    return (
      <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
          <span>You&apos;re all caught up — no pending actions.</span>
        </div>
      </div>
    );
  }

  const heading =
    actions.length === 1
      ? "Next step"
      : `${actions.length} next steps`;

  return (
    <section className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-amber-700" aria-hidden />
        <h2 className="text-sm font-semibold text-stone-900">{heading}</h2>
      </div>
      <ul className="mt-3 space-y-2">
        {actions.map((action) => (
          <ActionRow
            key={action.id}
            action={action}
            onResolved={(id) =>
              setActions((current) => current.filter((row) => row.id !== id))
            }
          />
        ))}
      </ul>
    </section>
  );
}
