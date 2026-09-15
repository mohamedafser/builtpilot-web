"use client";

import {
  showToast,
  TOAST_EVENT,
  TOAST_STORAGE_KEY,
  type ToastDetail,
} from "@/lib/toast";
import { cn } from "@/lib/utils";
import { CircleAlert, CircleCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Toast = ToastDetail & { id: string };

const TOAST_DURATION_MS = 5000;

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    function push(detail: ToastDetail) {
      const id = crypto.randomUUID();
      setToasts((current) =>
        [...current, { id, message: detail.message, variant: detail.variant }].slice(
          -3,
        ),
      );
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, TOAST_DURATION_MS);
    }

    function onToast(event: Event) {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      if (!detail?.message) {
        return;
      }
      push(detail);
    }

    window.addEventListener(TOAST_EVENT, onToast);

    try {
      const raw = sessionStorage.getItem(TOAST_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ToastDetail & { at?: number };
        if (
          parsed.message &&
          typeof parsed.at === "number" &&
          Date.now() - parsed.at < TOAST_DURATION_MS
        ) {
          push(parsed);
        }
        sessionStorage.removeItem(TOAST_STORAGE_KEY);
      }
    } catch {
      // Ignore unavailable storage (private mode).
    }

    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className="pointer-events-none fixed top-4 right-4 left-4 z-9999 flex flex-col items-end gap-2 sm:left-auto sm:w-96"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.variant === "error" ? "alert" : "status"}
          className={cn(
            "toast-enter pointer-events-auto flex w-full items-start gap-3 rounded-lg border bg-white px-4 py-3 text-sm shadow-lg",
            toast.variant === "error"
              ? "border-red-200 text-red-800"
              : "border-emerald-200 text-emerald-800",
          )}
        >
          {toast.variant === "error" ? (
            <CircleAlert
              className="mt-0.5 size-4 shrink-0 text-red-600"
              strokeWidth={1.75}
              aria-hidden
            />
          ) : (
            <CircleCheck
              className="mt-0.5 size-4 shrink-0 text-emerald-600"
              strokeWidth={1.75}
              aria-hidden
            />
          )}
          <p className="flex-1 leading-5">{toast.message}</p>
          <button
            type="button"
            className="rounded p-0.5 text-stone-400 hover:text-stone-700"
            onClick={() =>
              setToasts((current) =>
                current.filter((item) => item.id !== toast.id),
              )
            }
            aria-label="Dismiss notification"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}

export function useToast() {
  return {
    toast: showToast,
    success: (message: string) => showToast(message, "success"),
    error: (message: string) => showToast(message, "error"),
  };
}
