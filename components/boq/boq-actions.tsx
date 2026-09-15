"use client";

import { Button, linkButtonClassName } from "@/components/ui/button";
import { WithIcon } from "@/components/ui/with-icon";
import { useDisclosure } from "@/hooks/use-disclosure";
import { requestJson } from "@/lib/api/client";
import { boqActions } from "@/lib/boq/calculations";
import type { BoqDetail, BoqListItem } from "@/lib/boq/types";
import { Archive, CheckCircle2, Copy, Pencil, Play, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type ActionKind = "activate" | "complete" | "archive";

export function BoqActions({
  projectId,
  boq,
  layout = "row",
  onUpdated,
}: {
  projectId: string;
  boq: Pick<BoqDetail | BoqListItem, "id" | "status" | "name">;
  layout?: "row" | "stack";
  onUpdated?: () => void;
}) {
  const router = useRouter();
  const { isOpen, open, close } = useDisclosure();
  const [action, setAction] = useState<ActionKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const actions = boqActions(boq.status);
  const actionSize = layout === "stack" ? "md" : "sm";
  const base = `/projects/${projectId}/boq/${boq.id}`;

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

  function startAction(next: ActionKind) {
    setAction(next);
    setError(null);
    open();
  }

  function confirm() {
    if (!action) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await requestJson<{ id: string }>(
        `/api/projects/${projectId}/boq/${boq.id}/${action}`,
        { method: "POST" },
      );

      if (!result.ok) {
        setError(result.message);
        return;
      }

      close();
      onUpdated?.();
      router.refresh();
    });
  }

  function duplicate() {
    startTransition(async () => {
      const result = await requestJson<{ id: string }>(
        `/api/projects/${projectId}/boq/${boq.id}/duplicate`,
        { method: "POST" },
      );

      if (!result.ok) {
        return;
      }

      router.push(`/projects/${projectId}/boq/${result.data.id}/edit`);
      router.refresh();
    });
  }

  const dialogCopy: Record<
    ActionKind,
    { title: string; body: string; confirm: string; danger?: boolean }
  > = {
    activate: {
      title: "Activate BOQ",
      body: "Mark this BOQ as active so site measurements can continue against it.",
      confirm: "Activate",
    },
    complete: {
      title: "Mark BOQ completed",
      body: "Mark this BOQ as completed? Items and measurements will become read-only.",
      confirm: "Mark completed",
    },
    archive: {
      title: "Archive BOQ",
      body: "Archive this BOQ? It will stay in history and can still be duplicated.",
      confirm: "Archive",
      danger: true,
    },
  };

  return (
    <>
      <div
        className={
          layout === "stack"
            ? "flex flex-col gap-2 sm:flex-row sm:flex-wrap"
            : "flex flex-wrap items-center gap-2"
        }
      >
        {actions.edit ? (
          <Link
            href={`${base}/edit`}
            className={linkButtonClassName("secondary", actionSize)}
          >
            <WithIcon icon={Pencil}>Edit</WithIcon>
          </Link>
        ) : null}
        {actions.activate ? (
          <Button
            size={actionSize}
            icon={Play}
            onClick={() => startAction("activate")}
          >
            Activate
          </Button>
        ) : null}
        {actions.complete ? (
          <Button
            variant="secondary"
            size={actionSize}
            icon={CheckCircle2}
            onClick={() => startAction("complete")}
          >
            Mark completed
          </Button>
        ) : null}
        <Button
          variant="secondary"
          size={actionSize}
          icon={Copy}
          onClick={duplicate}
          disabled={isPending}
        >
          Duplicate
        </Button>
        {actions.archive ? (
          <Button
            variant="danger"
            size={actionSize}
            icon={Archive}
            onClick={() => startAction("archive")}
          >
            Archive
          </Button>
        ) : null}
      </div>

      {isOpen && action ? (
        <div className="fixed inset-0 z-50 m-0 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-stone-950/40"
            aria-label="Close dialog"
            onClick={close}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="boq-action-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-lg"
          >
            <h2
              id="boq-action-title"
              className="text-base font-semibold text-stone-900"
            >
              {dialogCopy[action].title}
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              {dialogCopy[action].body}
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
                Close
              </Button>
              <Button
                variant={dialogCopy[action].danger ? "danger" : "primary"}
                icon={
                  action === "activate"
                    ? Play
                    : action === "complete"
                      ? CheckCircle2
                      : Archive
                }
                onClick={confirm}
                disabled={isPending}
              >
                {isPending ? "Working..." : dialogCopy[action].confirm}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
