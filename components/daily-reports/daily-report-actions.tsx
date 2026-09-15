"use client";

import { Button, linkButtonClassName } from "@/components/ui/button";
import { WithIcon } from "@/components/ui/with-icon";
import { useDisclosure } from "@/hooks/use-disclosure";
import { requestJson } from "@/lib/api/client";
import { formatDate } from "@/lib/utils";
import { Archive, Eye, Pencil, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type DailyReportActionsProps = {
  projectId: string;
  reportId: string;
  reportDate: string;
  archived: boolean;
  showView?: boolean;
  layout?: "row" | "stack";
};

export function DailyReportActions({
  projectId,
  reportId,
  reportDate,
  archived,
  showView = false,
  layout = "row",
}: DailyReportActionsProps) {
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
            `/api/projects/${projectId}/reports/${reportId}/restore`,
            { method: "POST" },
          )
        : await requestJson<{ id: string }>(
            `/api/projects/${projectId}/reports/${reportId}/archive`,
            { method: "POST" },
          );

      if (!result.ok) {
        setError(result.message);
        return;
      }

      close();
      router.push(
        archived
          ? `/projects/${projectId}/reports/${reportId}`
          : `/projects/${projectId}/reports`,
      );
      router.refresh();
    });
  }

  const actionSize = layout === "stack" ? "md" : "sm";

  return (
    <>
      <div
        className={
          layout === "stack"
            ? "flex flex-col gap-2 sm:flex-row"
            : "flex flex-wrap items-center gap-2"
        }
      >
        {showView ? (
          <Link
            href={`/projects/${projectId}/reports/${reportId}`}
            className={linkButtonClassName("secondary", actionSize)}
          >
            <WithIcon icon={Eye}>View report</WithIcon>
          </Link>
        ) : null}
        <Link
          href={`/projects/${projectId}/reports/${reportId}/edit`}
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
            aria-labelledby="archive-report-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-lg"
          >
            <h2
              id="archive-report-title"
              className="text-base font-semibold text-stone-900"
            >
              {archived ? "Restore daily report" : "Archive daily report"}
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              {archived
                ? `Restore the report for ${formatDate(reportDate)} to the active list?`
                : `Archive the report for ${formatDate(reportDate)}? It will be hidden from the default list and can be restored later.`}
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
                    ? "Restore report"
                    : "Archive report"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
