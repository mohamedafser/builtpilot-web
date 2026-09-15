"use client";

import { Button, linkButtonClassName } from "@/components/ui/button";
import { WithIcon } from "@/components/ui/with-icon";
import { useDisclosure } from "@/hooks/use-disclosure";
import { requestJson } from "@/lib/api/client";
import { formatDate } from "@/lib/utils";
import { Ban, Eye, Pencil, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type ExpenseActionsProps = {
  projectId: string;
  expenseId: string;
  description: string;
  expenseDate: string;
  voided: boolean;
  showView?: boolean;
  layout?: "row" | "stack";
  onVoided?: () => void;
};

export function ExpenseActions({
  projectId,
  expenseId,
  description,
  expenseDate,
  voided,
  showView = false,
  layout = "row",
  onVoided,
}: ExpenseActionsProps) {
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

  function confirmVoid() {
    setError(null);
    startTransition(async () => {
      const result = await requestJson<{ id: string }>(
        `/api/projects/${projectId}/expenses/${expenseId}/void`,
        { method: "POST" },
      );

      if (!result.ok) {
        setError(result.message);
        return;
      }

      close();
      onVoided?.();
      router.refresh();
      if (!onVoided) {
        router.push(`/projects/${projectId}/expenses/${expenseId}`);
      }
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
            href={`/projects/${projectId}/expenses/${expenseId}`}
            className={linkButtonClassName("secondary", actionSize)}
          >
            <WithIcon icon={Eye}>View</WithIcon>
          </Link>
        ) : null}
        {!voided ? (
          <>
            <Link
              href={`/projects/${projectId}/expenses/${expenseId}/edit`}
              className={linkButtonClassName("secondary", actionSize)}
            >
              <WithIcon icon={Pencil}>Edit</WithIcon>
            </Link>
            <Button variant="danger" size={actionSize} icon={Ban} onClick={open}>
              Void
            </Button>
          </>
        ) : null}
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
            aria-labelledby="void-expense-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-lg"
          >
            <h2
              id="void-expense-title"
              className="text-base font-semibold text-stone-900"
            >
              Void expense
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              Void {description} from {formatDate(expenseDate)}? It will stay in
              history but will not count toward project cost.
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
                variant="danger"
                icon={Ban}
                onClick={confirmVoid}
                disabled={isPending}
              >
                {isPending ? "Voiding..." : "Void expense"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
