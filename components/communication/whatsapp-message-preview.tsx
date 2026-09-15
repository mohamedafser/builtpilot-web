"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { requestJson } from "@/lib/api/client";
import { maskPhone } from "@/lib/whatsapp/validation";
import { showToast } from "@/lib/toast";
import { Send, X } from "lucide-react";
import { useEffect, useState } from "react";

type WhatsAppMessagePreviewProps = {
  open: boolean;
  title?: string;
  toPhone: string | null;
  initialMessage: string;
  messageType:
    | "client_update"
    | "portal_link"
    | "daily_report"
    | "quotation"
    | "other";
  projectId: string;
  requireActivePortal?: boolean;
  onClose: () => void;
  onSent?: () => void;
};

export function WhatsAppMessagePreview({
  open,
  title = "Send WhatsApp Update",
  toPhone,
  initialMessage,
  messageType,
  projectId,
  requireActivePortal,
  onClose,
  onSent,
}: WhatsAppMessagePreviewProps) {
  const [message, setMessage] = useState(initialMessage);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setMessage(initialMessage);
      setError(null);
      setSending(false);
    }
  }, [open, initialMessage]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !sending) {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, sending]);

  if (!open) {
    return null;
  }

  async function send() {
    if (sending) {
      return;
    }

    setError(null);
    setSending(true);

    // Stable within a double-click; include a click nonce so retries after
    // a real failure are not stuck on a cached failed row.
    const key = `send:${projectId}:${messageType}:${hashLite(message)}:${Date.now()}`;

    const result = await requestJson<{
      id: string;
      status: string;
      recipient_phone: string;
    }>("/api/whatsapp/send", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        messageType,
        content: message,
        idempotencyKey: key,
        requireActivePortal,
      }),
      notify: false,
    });

    setSending(false);

    if (!result.ok) {
      setError(result.message);
      showToast(result.message, "error");
      return;
    }

    if (result.data.status === "failed") {
      const failedMessage =
        "We couldn't send this WhatsApp message. Check the message history for details.";
      setError(failedMessage);
      showToast(failedMessage, "error");
      return;
    }

    showToast("WhatsApp message sent.", "success");
    onSent?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 py-6 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-stone-950/40"
        aria-label="Close dialog"
        onClick={() => {
          if (!sending) {
            onClose();
          }
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsapp-preview-title"
        className="relative z-10 w-full max-w-lg rounded-xl border border-stone-200 bg-white p-5 shadow-lg"
      >
        <h2
          id="whatsapp-preview-title"
          className="text-base font-semibold text-stone-900"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          To:{" "}
          <span className="font-medium text-stone-900">
            {toPhone ? maskPhone(toPhone) : "Not configured"}
          </span>
        </p>
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-stone-700">
            Message
          </label>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="min-h-48 font-mono text-sm"
            disabled={sending}
          />
        </div>
        {error ? (
          <Alert variant="error" className="mt-3">
            {error}
          </Alert>
        ) : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={sending}
            icon={X}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void send()}
            disabled={sending || !message.trim() || !toPhone}
            icon={Send}
          >
            {sending ? "Sending message..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function hashLite(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}
