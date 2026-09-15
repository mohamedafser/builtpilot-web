"use client";

import { HealthPill } from "@/components/projects/project-visuals";
import { linkButtonClassName } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WithIcon } from "@/components/ui/with-icon";
import { requestJson } from "@/lib/api/client";
import type { ContractorClientPortalState } from "@/lib/client-portal/types";
import { cn } from "@/lib/utils";
import { Eye, Globe, Settings, Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function portalTone(
  status: "active" | "inactive" | "expired" | "none",
): "good" | "warn" | "bad" | "neutral" {
  if (status === "active") {
    return "good";
  }
  if (status === "expired") {
    return "bad";
  }
  if (status === "inactive") {
    return "warn";
  }
  return "neutral";
}

function statusCopy(state: ContractorClientPortalState | null) {
  if (!state?.access) {
    return {
      status: "none" as const,
      title: "Not enabled",
      detail: "Share a read-only link with your client.",
    };
  }

  if (state.access.portal_status === "active") {
    return {
      status: "active" as const,
      title: "Sharing with client",
      detail: state.access.client_name,
    };
  }

  if (state.access.portal_status === "expired") {
    return {
      status: "expired" as const,
      title: "Link expired",
      detail: state.access.client_name,
    };
  }

  return {
    status: "inactive" as const,
    title: "Paused",
    detail: state.access.client_name,
  };
}

export function ProjectClientPortalCard({ projectId }: { projectId: string }) {
  const [state, setState] = useState<ContractorClientPortalState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await requestJson<ContractorClientPortalState>(
        `/api/projects/${projectId}/client-portal`,
      );

      if (cancelled) {
        return;
      }

      setState(result.ok ? result.data : null);
      setIsLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const copy = statusCopy(state);
  const active = copy.status === "active";

  if (isLoading) {
    return <Skeleton className="h-16 w-full rounded-xl" />;
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              active
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                : "bg-stone-50 text-stone-500 ring-1 ring-stone-100",
            )}
          >
            <Globe className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-stone-900">
                Client portal
              </h3>
              <HealthPill
                label={
                  copy.status === "active"
                    ? "Active"
                    : copy.status === "expired"
                      ? "Expired"
                      : copy.status === "inactive"
                        ? "Paused"
                        : "Off"
                }
                tone={portalTone(copy.status)}
              />
            </div>
            <p className="mt-0.5 truncate text-xs text-stone-500">
              <span className="font-medium text-stone-700">{copy.title}</span>
              {copy.detail ? ` · ${copy.detail}` : null}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <Link
            href={`/projects/${projectId}/client-portal`}
            className={cn(
              linkButtonClassName(active ? "secondary" : "primary", "sm"),
            )}
          >
            <WithIcon icon={active ? Settings : Share2}>
              {active ? "Settings" : "Enable"}
            </WithIcon>
          </Link>
          {active ? (
            <Link
              href={`/client/preview/${projectId}`}
              className={cn(linkButtonClassName("secondary", "sm"))}
            >
              <WithIcon icon={Eye}>Preview</WithIcon>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
