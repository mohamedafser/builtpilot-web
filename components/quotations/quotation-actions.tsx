"use client";

import { ShareQuotationWhatsAppButton } from "@/components/communication/share-quotation-button";
import { Button, linkButtonClassName } from "@/components/ui/button";
import { WithIcon } from "@/components/ui/with-icon";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDisclosure } from "@/hooks/use-disclosure";
import { requestJson } from "@/lib/api/client";
import { quotationActions } from "@/lib/quotations/calculations";
import type { QuotationDetail } from "@/lib/quotations/types";
import {
  Ban,
  CheckCircle2,
  Copy,
  Eye,
  FolderKanban,
  Pencil,
  Send,
  ThumbsDown,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type ActionKind = "send" | "accept" | "reject" | "cancel" | "convert";

export function QuotationActions({
  quotation,
  layout = "row",
  onUpdated,
}: {
  quotation: QuotationDetail;
  layout?: "row" | "stack";
  onUpdated?: () => void;
}) {
  const router = useRouter();
  const { isOpen, open, close } = useDisclosure();
  const [action, setAction] = useState<ActionKind | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const actions = quotationActions(
    quotation.effective_status,
    Boolean(quotation.project_id),
  );
  const actionSize = layout === "stack" ? "md" : "sm";

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
    setRejectionReason("");
    open();
  }

  function confirm() {
    if (!action) {
      return;
    }

    setError(null);
    startTransition(async () => {
      if (action === "send") {
        const result = await requestJson<{ id: string }>(
          `/api/quotations/${quotation.id}/send`,
          { method: "POST" },
        );
        if (!result.ok) {
          setError(result.message);
          return;
        }
      } else if (action === "accept") {
        const result = await requestJson<{ id: string }>(
          `/api/quotations/${quotation.id}/accept`,
          { method: "POST" },
        );
        if (!result.ok) {
          setError(result.message);
          return;
        }
      } else if (action === "reject") {
        const result = await requestJson<{ id: string }>(
          `/api/quotations/${quotation.id}/reject`,
          {
            method: "POST",
            body: JSON.stringify({ rejection_reason: rejectionReason }),
          },
        );
        if (!result.ok) {
          setError(result.message);
          return;
        }
      } else if (action === "cancel") {
        const result = await requestJson<{ id: string }>(
          `/api/quotations/${quotation.id}/cancel`,
          { method: "POST" },
        );
        if (!result.ok) {
          setError(result.message);
          return;
        }
      } else if (action === "convert") {
        const result = await requestJson<{ id: string; project_id: string }>(
          `/api/quotations/${quotation.id}/convert`,
          { method: "POST" },
        );
        if (!result.ok) {
          setError(result.message);
          return;
        }
        close();
        onUpdated?.();
        router.push(`/projects/${result.data.project_id}`);
        router.refresh();
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
        `/api/quotations/${quotation.id}/duplicate`,
        { method: "POST" },
      );

      if (!result.ok) {
        return;
      }

      router.push(`/quotations/${result.data.id}/edit`);
      router.refresh();
    });
  }

  const dialogCopy: Record<
    ActionKind,
    { title: string; body: string; confirm: string; danger?: boolean }
  > = {
    send: {
      title: "Send quotation",
      body: quotation.client_email
        ? `Email this quotation to ${quotation.client_email}? You will not be able to edit it after sending.`
        : "Add a client email before sending. Open Edit and fill in the client email.",
      confirm: "Send email",
    },
    accept: {
      title: "Accept quotation",
      body: "Mark this quotation as accepted? Historical pricing will stay locked.",
      confirm: "Mark accepted",
    },
    reject: {
      title: "Reject quotation",
      body: "Mark this quotation as rejected? You can optionally add a reason.",
      confirm: "Mark rejected",
      danger: true,
    },
    cancel: {
      title: "Cancel quotation",
      body: "Cancel this quotation? It will stay in history and can still be duplicated.",
      confirm: "Cancel quotation",
      danger: true,
    },
    convert: {
      title: "Convert to project",
      body: "Create a new project from this accepted quotation? The quotation will stay as the estimate.",
      confirm: "Create project",
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
            href={`/quotations/${quotation.id}/edit`}
            className={linkButtonClassName("secondary", actionSize)}
          >
            <WithIcon icon={Pencil}>Edit</WithIcon>
          </Link>
        ) : null}
        {actions.send ? (
          <Button
            size={actionSize}
            icon={Send}
            onClick={() => startAction("send")}
          >
            Send
          </Button>
        ) : null}
        {quotation.project_id ? (
          <ShareQuotationWhatsAppButton quotation={quotation} />
        ) : null}
        {actions.accept ? (
          <Button
            size={actionSize}
            icon={CheckCircle2}
            onClick={() => startAction("accept")}
          >
            Mark accepted
          </Button>
        ) : null}
        {actions.reject ? (
          <Button
            variant="secondary"
            size={actionSize}
            icon={ThumbsDown}
            onClick={() => startAction("reject")}
          >
            Mark rejected
          </Button>
        ) : null}
        {actions.convert ? (
          <Button
            size={actionSize}
            icon={FolderKanban}
            onClick={() => startAction("convert")}
          >
            Convert to project
          </Button>
        ) : null}
        {actions.viewProject && quotation.project_id ? (
          <Link
            href={`/projects/${quotation.project_id}`}
            className={linkButtonClassName("secondary", actionSize)}
          >
            <WithIcon icon={Eye}>View project</WithIcon>
          </Link>
        ) : quotation.project_id ? (
          <p className="text-sm text-stone-500">Already linked to project.</p>
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
        {actions.cancel ? (
          <Button
            variant="danger"
            size={actionSize}
            icon={Ban}
            onClick={() => startAction("cancel")}
          >
            Cancel
          </Button>
        ) : null}
      </div>

      {isOpen && action ? (
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
            aria-labelledby="quotation-action-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-lg"
          >
            <h2
              id="quotation-action-title"
              className="text-base font-semibold text-stone-900"
            >
              {dialogCopy[action].title}
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              {dialogCopy[action].body}
            </p>
            {action === "reject" ? (
              <div className="mt-4">
                <Label htmlFor="rejection_reason">Reason (optional)</Label>
                <Textarea
                  id="rejection_reason"
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                />
              </div>
            ) : null}
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
                  action === "send"
                    ? Send
                    : action === "accept"
                      ? CheckCircle2
                      : action === "reject"
                        ? ThumbsDown
                        : action === "convert"
                          ? FolderKanban
                          : Ban
                }
                onClick={confirm}
                disabled={
                  isPending || (action === "send" && !quotation.client_email)
                }
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
