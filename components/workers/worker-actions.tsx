"use client";

import { Button, linkButtonClassName } from "@/components/ui/button";
import { WithIcon } from "@/components/ui/with-icon";
import { useDisclosure } from "@/hooks/use-disclosure";
import { requestJson } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { WorkerStatus } from "@/types";
import { Eye, Pencil, RotateCcw, UserX, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type WorkerActionsProps = {
  workerId: string;
  workerName: string;
  status: WorkerStatus;
  showView?: boolean;
  layout?: "row" | "stack";
};

export function WorkerActions({
  workerId,
  workerName,
  status,
  showView = true,
  layout = "row",
}: WorkerActionsProps) {
  const router = useRouter();
  const { isOpen, open, close } = useDisclosure();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inactive = status === "inactive";

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
      const result = inactive
        ? await requestJson<{ id: string }>(`/api/workers/${workerId}/restore`, {
            method: "POST",
          })
        : await requestJson<{ id: string }>(
            `/api/workers/${workerId}/deactivate`,
            { method: "POST" },
          );

      if (!result.ok) {
        showToast(result.message, "error");
        setError(result.message);
        return;
      }

      showToast(result.message, "success");
      close();
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
            href={`/workers/${workerId}`}
            className={linkButtonClassName("secondary", actionSize)}
          >
            <WithIcon icon={Eye}>View</WithIcon>
          </Link>
        ) : null}
        <Link
          href={`/workers/${workerId}/edit`}
          className={linkButtonClassName("secondary", actionSize)}
        >
          <WithIcon icon={Pencil}>Edit</WithIcon>
        </Link>
        <Button
          variant={inactive ? "secondary" : "danger"}
          size={actionSize}
          icon={inactive ? RotateCcw : UserX}
          onClick={open}
        >
          {inactive ? "Reactivate" : "Deactivate"}
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
            aria-labelledby="worker-status-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-lg"
          >
            <h2
              id="worker-status-title"
              className="text-base font-semibold text-stone-900"
            >
              {inactive ? "Reactivate worker" : "Deactivate worker"}
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              {inactive
                ? `Restore “${workerName}” so they can be assigned to projects again?`
                : `Deactivate “${workerName}”? Historical attendance stays available, but they will not be newly assigned by default.`}
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
                variant={inactive ? "primary" : "danger"}
                icon={inactive ? RotateCcw : UserX}
                onClick={confirmAction}
                disabled={isPending}
              >
                {isPending
                  ? inactive
                    ? "Reactivating..."
                    : "Deactivating..."
                  : inactive
                    ? "Reactivate worker"
                    : "Deactivate worker"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
