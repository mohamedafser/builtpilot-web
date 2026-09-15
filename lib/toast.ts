"use client";

export type ToastVariant = "success" | "error";

export type ToastDetail = {
  message: string;
  variant: ToastVariant;
};

export const TOAST_EVENT = "buildpilot:toast";
export const TOAST_STORAGE_KEY = "buildpilot.toast";

const recentToastKeys = new Map<string, number>();

function isDuplicateToast(message: string, variant: ToastVariant) {
  const key = `${variant}:${message}`;
  const now = Date.now();
  const lastSeen = recentToastKeys.get(key);

  if (lastSeen && now - lastSeen < 1200) {
    return true;
  }

  recentToastKeys.set(key, now);
  window.setTimeout(() => {
    recentToastKeys.delete(key);
  }, 1500);

  return false;
}

export function showToast(message: string, variant: ToastVariant) {
  if (typeof window === "undefined" || !message) {
    return;
  }

  if (isDuplicateToast(message, variant)) {
    return;
  }

  const now = Date.now();

  const detail: ToastDetail & { at: number } = {
    message,
    variant,
    at: now,
  };

  try {
    sessionStorage.setItem(TOAST_STORAGE_KEY, JSON.stringify(detail));
  } catch {
    // Ignore unavailable storage (private mode).
  }

  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail }));
  window.setTimeout(() => {
    try {
      sessionStorage.removeItem(TOAST_STORAGE_KEY);
    } catch {
      // Ignore unavailable storage (private mode).
    }
  }, 5000);
}
