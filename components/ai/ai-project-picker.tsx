"use client";

import { StatusBadge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { isProjectStatus } from "@/constants/project";
import type { AIProjectOption } from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

type AIProjectPickerProps = {
  projects: AIProjectOption[];
  loading?: boolean;
  currentProjectId?: string | null;
  question?: string | null;
  compact?: boolean;
  onSelect: (project: AIProjectOption) => void;
};

export function AIProjectPicker({
  projects,
  loading = false,
  currentProjectId,
  question,
  compact = false,
  onSelect,
}: AIProjectPickerProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-amber-200 bg-amber-50",
        compact ? "p-3" : "p-4",
      )}
    >
      <p className={cn("font-semibold text-stone-900", compact ? "text-sm" : "text-sm")}>
        Choose a project
      </p>
      <p className={cn("mt-1 text-stone-600", compact ? "text-xs" : "text-sm")}>
        {question
          ? "Select the project this question is about. You can switch if the next question is for a different project."
          : "Select the project BuildPilot AI should use."}
      </p>
      {question ? (
        <p
          className={cn(
            "mt-2 rounded-md bg-white/80 px-2 py-1.5 text-stone-700",
            compact ? "text-xs" : "text-sm",
          )}
        >
          “{question}”
        </p>
      ) : null}

      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-stone-500">
          <Spinner className="h-4 w-4" />
          Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <p className={cn("mt-3 text-stone-600", compact ? "text-xs" : "text-sm")}>
          No projects yet.{" "}
          <Link href="/projects/new" className="font-medium text-amber-800 hover:underline">
            Create a project
          </Link>{" "}
          first.
        </p>
      ) : (
        <div className={cn("mt-3 space-y-2", compact ? "max-h-48 overflow-y-auto" : "max-h-72 overflow-y-auto")}>
          {projects.map((project) => {
            const selected = project.id === currentProjectId;

            return (
              <button
                key={project.id}
                type="button"
                onClick={() => onSelect(project)}
                className={cn(
                  "flex w-full items-start justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-left transition hover:border-amber-300",
                  selected ? "border-amber-400 ring-1 ring-amber-200" : "border-stone-200",
                )}
              >
                <span className="min-w-0">
                  <span className={cn("block truncate font-medium text-stone-900", compact ? "text-sm" : "text-sm")}>
                    {project.name}
                  </span>
                  {project.location ? (
                    <span className="mt-0.5 block truncate text-xs text-stone-500">
                      {project.location}
                    </span>
                  ) : null}
                </span>
                {isProjectStatus(project.status) ? (
                  <StatusBadge status={project.status} />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
