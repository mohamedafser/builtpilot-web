"use client";

import { Button, linkButtonClassName } from "@/components/ui/button";
import { WithIcon } from "@/components/ui/with-icon";
import { useDisclosure } from "@/hooks/use-disclosure";
import { requestJson } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Archive, Eye, Pencil, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type ProjectActionsProps = {
  projectId: string;
  projectName: string;
  archived: boolean;
  showView?: boolean;
  layout?: "row" | "stack";
};

export function ProjectActions({
  projectId,
  projectName,
  archived,
  showView = true,
  layout = "row",
}: ProjectActionsProps) {
  const router = useRouter();
  const { isOpen, open, close } = useDisclosure();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  function confirmAction() {
    setError(null);
    startTransition(async () => {
      const result = archived
        ? await requestJson<{ id: string }>(
            `/api/projects/${projectId}/restore`,
            { method: "POST" },
          )
        : await requestJson<{ id: string }>(
            `/api/projects/${projectId}/archive`,
            { method: "POST" },
          );

      if (!result.ok) {
        showToast(result.message, "error");
        setError(result.message);
        return;
      }

      showToast(result.message, "success");
      router.push(archived ? `/projects/${projectId}` : "/projects");
      router.refresh();
    });
  }

  const actionSize = layout === "stack" ? "md" : "sm";

  return (
    <>
      <div
        className={cn(
          "flex gap-2",
          layout === "stack"
            ? "flex-col sm:flex-row"
            : "flex-wrap items-center",
        )}
      >
        {showView ? (
          <Link
            href={`/projects/${projectId}`}
            className={linkButtonClassName("secondary", actionSize)}
          >
            <WithIcon icon={Eye}>View</WithIcon>
          </Link>
        ) : null}
        <Link
          href={`/projects/${projectId}/edit`}
          className={linkButtonClassName("secondary", actionSize)}
        >
          <WithIcon icon={Pencil}>Edit</WithIcon>
        </Link>
        <Button
          variant={archived ? "secondary" : "danger"}
          size={actionSize}
          icon={archived ? RotateCcw : Archive}
          onClick={open}
        >
          {archived ? "Restore" : "Archive"}
        </Button>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-stone-950/40"
            aria-label="Close dialog"
            onClick={close}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-project-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-lg"
          >
            <h2
              id="archive-project-title"
              className="text-base font-semibold text-stone-900"
            >
              {archived ? "Restore project" : "Archive project"}
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              {archived
                ? `Restore “${projectName}” to the active project list?`
                : `Archive “${projectName}”? It will be hidden from the default project list and can be restored later.`}
            </p>
            {error ? (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            ) : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                icon={X}
                onClick={close}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant={archived ? "primary" : "danger"}
                icon={archived ? RotateCcw : Archive}
                onClick={confirmAction}
                disabled={isPending}
              >
                {isPending
                  ? archived
                    ? "Restoring..."
                    : "Archiving..."
                  : archived
                    ? "Restore project"
                    : "Archive project"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
