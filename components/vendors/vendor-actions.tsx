"use client";

import { Button, linkButtonClassName } from "@/components/ui/button";
import { WithIcon } from "@/components/ui/with-icon";
import { useDisclosure } from "@/hooks/use-disclosure";
import { requestJson } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { VendorStatus } from "@/types";
import { Building2, Eye, Pencil, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export function VendorActions({
  vendorId,
  vendorName,
  status,
  showView = true,
  layout = "row",
}: {
  vendorId: string;
  vendorName: string;
  status: VendorStatus;
  showView?: boolean;
  layout?: "row" | "stack";
}) {
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
        ? await requestJson<{ id: string }>(`/api/vendors/${vendorId}/restore`, {
            method: "POST",
          })
        : await requestJson<{ id: string }>(
            `/api/vendors/${vendorId}/deactivate`,
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
            href={`/vendors/${vendorId}`}
            className={linkButtonClassName("secondary", actionSize)}
          >
            <WithIcon icon={Eye}>View</WithIcon>
          </Link>
        ) : null}
        <Link
          href={`/vendors/${vendorId}/edit`}
          className={linkButtonClassName("secondary", actionSize)}
        >
          <WithIcon icon={Pencil}>Edit</WithIcon>
        </Link>
        <Button
          variant={inactive ? "secondary" : "danger"}
          size={actionSize}
          icon={inactive ? RotateCcw : Building2}
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
            aria-labelledby="vendor-status-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-lg"
          >
            <h2
              id="vendor-status-title"
              className="text-base font-semibold text-stone-900"
            >
              {inactive ? "Reactivate vendor" : "Deactivate vendor"}
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              {inactive
                ? `Restore “${vendorName}” so they can be selected for new purchases?`
                : `Deactivate “${vendorName}”? Purchase history stays available, but they will not appear in new receive forms.`}
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
                icon={inactive ? RotateCcw : Building2}
                onClick={confirmAction}
                disabled={isPending}
              >
                {isPending
                  ? inactive
                    ? "Reactivating..."
                    : "Deactivating..."
                  : inactive
                    ? "Reactivate vendor"
                    : "Deactivate vendor"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
