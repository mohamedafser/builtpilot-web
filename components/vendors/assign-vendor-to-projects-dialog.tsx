"use client";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { requestJson } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { Project } from "@/types";
import { Plus, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

export function AssignVendorToProjectsDialog({
  vendorId,
  vendorName,
  open,
  onClose,
  onAssigned,
}: {
  vendorId: string;
  vendorName: string;
  open: boolean;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setError(null);
    setSelected([]);
    setIsLoading(true);

    void requestJson<{ projects: Project[] }>(
      `/api/vendors/${vendorId}/available-projects`,
    ).then((result) => {
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setError(result.message);
        setProjects([]);
        setIsLoading(false);
        return;
      }

      setProjects(result.data.projects);
      setIsLoading(false);
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, vendorId]);

  if (!open) {
    return null;
  }

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  function assign() {
    setError(null);
    startTransition(async () => {
      const result = await requestJson<{ ids: string[] }>(
        `/api/vendors/${vendorId}/assign`,
        {
          method: "POST",
          body: JSON.stringify({ project_ids: selected }),
        },
      );

      if (!result.ok) {
        showToast(result.message, "error");
        setError(result.message);
        return;
      }

      showToast(result.message, "success");
      onAssigned();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:px-4">
      <button
        type="button"
        className="absolute inset-0 bg-stone-950/40"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-vendor-projects-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-hidden rounded-t-2xl border border-stone-200 bg-white shadow-lg sm:rounded-xl"
      >
        <div className="border-b border-stone-100 p-5">
          <h2
            id="assign-vendor-projects-title"
            className="text-base font-semibold text-stone-900"
          >
            Add project
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Choose jobs to add {vendorName} to. Already listed projects are
            hidden.
          </p>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-5">
          {isLoading ? (
            <p className="text-sm text-stone-500">Loading projects...</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-stone-500">
              No available projects. Create a project first, or this vendor is
              already added to every active job.
            </p>
          ) : (
            <ul className="space-y-2">
              {projects.map((project) => {
                const checked = selected.includes(project.id);

                return (
                  <li key={project.id}>
                    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-stone-200 px-3 py-3 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-amber-600"
                        checked={checked}
                        onChange={() => toggle(project.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-stone-900">
                          {project.name}
                        </span>
                        <span className="block text-sm text-stone-500">
                          {project.location || "No location"}
                        </span>
                      </span>
                      <StatusBadge status={project.status} />
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-stone-100 p-5 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isPending}
            icon={X}
          >
            Cancel
          </Button>
          <Button
            onClick={assign}
            disabled={isPending || selected.length === 0}
            className="h-12 sm:h-10"
            icon={Plus}
          >
            {isPending
              ? "Adding..."
              : selected.length
                ? `Add ${selected.length}`
                : "Add project"}
          </Button>
        </div>
      </div>
    </div>
  );
}
