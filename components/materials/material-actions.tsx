"use client";

import { Button, linkButtonClassName } from "@/components/ui/button";
import { useDisclosure } from "@/hooks/use-disclosure";
import { requestJson } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { MaterialStatus } from "@/types";
import { PackageX, Pencil, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type MaterialActionsProps = {
  materialId: string;
  materialName: string;
  status: MaterialStatus;
  compact?: boolean;
  /** @deprecated View is via the material name link; kept for call-site compatibility. */
  showView?: boolean;
  layout?: "row" | "stack";
};

export function MaterialActions({
  materialId,
  materialName,
  status,
  compact = false,
  layout = "row",
}: MaterialActionsProps) {
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
        ? await requestJson<{ id: string }>(
            `/api/materials/${materialId}/restore`,
            { method: "POST" },
          )
        : await requestJson<{ id: string }>(
            `/api/materials/${materialId}/deactivate`,
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
      window.location.assign("/materials");
    });
  }

  return (
    <>
      <div
        className={cn(
          "flex gap-1",
          layout === "stack"
            ? "flex-col items-stretch"
            : "items-center justify-end",
        )}
      >
        <Link
          href={`/materials/${materialId}/edit`}
          className={cn(
            linkButtonClassName("secondary", "sm"),
            compact && "h-8 w-8 px-0",
          )}
          aria-label={`Edit ${materialName}`}
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
          {compact ? null : <span>Edit</span>}
        </Link>
        <Button
          variant={inactive ? "secondary" : "ghost"}
          size="sm"
          className={cn(
            compact && "h-8 px-2 text-xs",
            !inactive && "text-red-600 hover:bg-red-50 hover:text-red-700",
          )}
          aria-label={
            inactive
              ? `Reactivate ${materialName}`
              : `Deactivate ${materialName}`
          }
          title={inactive ? "Reactivate" : "Deactivate"}
          onClick={open}
          icon={inactive ? RotateCcw : PackageX}
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
            aria-labelledby="material-status-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-lg"
          >
            <h2
              id="material-status-title"
              className="text-base font-semibold text-stone-900"
            >
              {inactive ? "Reactivate material" : "Deactivate material"}
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              {inactive
                ? `Restore “${materialName}” so it can be used on projects again?`
                : `Deactivate “${materialName}”? Transaction history stays available, but it will not appear in new receive or usage forms.`}
            </p>
            {error ? (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            ) : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                size="sm"
                icon={X}
                onClick={close}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant={inactive ? "primary" : "danger"}
                size="sm"
                icon={inactive ? RotateCcw : PackageX}
                onClick={confirmAction}
                disabled={isPending}
              >
                {isPending
                  ? inactive
                    ? "Reactivating..."
                    : "Deactivating..."
                  : inactive
                    ? "Reactivate"
                    : "Deactivate"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
