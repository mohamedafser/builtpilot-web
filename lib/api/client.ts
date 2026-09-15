"use client";

import type { ApiResponse } from "@/lib/api/response";
import { invalidateApiCache } from "@/lib/api/client-cache";
import { showToast } from "@/lib/toast";

function notify(payload: ApiResponse<unknown>, method: string) {
  if (method === "GET" || method === "HEAD" || !payload.message) {
    return;
  }

  showToast(payload.message, payload.ok ? "success" : "error");
}

function invalidateAfterMutation(method: string, ok: boolean) {
  if (!ok) {
    return;
  }

  if (method === "GET" || method === "HEAD") {
    return;
  }

  invalidateApiCache();
}

export async function requestJson<T>(
  url: string,
  init?: RequestInit & { notify?: boolean },
): Promise<ApiResponse<T>> {
  const method = (init?.method ?? "GET").toUpperCase();
  const shouldNotify = init?.notify !== false;

  try {
    const { notify: _notify, ...requestInit } = init ?? {};
    void _notify;

    const response = await fetch(url, {
      ...requestInit,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...requestInit.headers,
      },
    });

    const payload = (await response
      .json()
      .catch(() => null)) as ApiResponse<T> | null;

    if (!payload || typeof payload !== "object" || !("ok" in payload)) {
      const fallback = {
        ok: false as const,
        message: "Unable to complete this action. Please try again.",
      };
      if (shouldNotify) {
        notify(fallback, method);
      }
      return fallback;
    }

    invalidateAfterMutation(method, payload.ok);

    if (shouldNotify) {
      notify(payload, method);
    }
    return payload;
  } catch {
    const fallback = {
      ok: false as const,
      message: "Network error. Check your connection and try again.",
    };
    if (shouldNotify) {
      notify(fallback, method);
    }
    return fallback;
  }
}

export async function requestFormData<T>(
  url: string,
  formData: FormData,
  options?: { notify?: boolean },
): Promise<ApiResponse<T>> {
  const shouldNotify = options?.notify !== false;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    });

    const payload = (await response
      .json()
      .catch(() => null)) as ApiResponse<T> | null;

    if (!payload || typeof payload !== "object" || !("ok" in payload)) {
      const fallback = {
        ok: false as const,
        message: "Unable to complete this action. Please try again.",
      };
      if (shouldNotify) {
        notify(fallback, "POST");
      }
      return fallback;
    }

    invalidateAfterMutation("POST", payload.ok);

    if (shouldNotify) {
      notify(payload, "POST");
    }
    return payload;
  } catch {
    const fallback = {
      ok: false as const,
      message: "Network error. Check your connection and try again.",
    };
    if (shouldNotify) {
      notify(fallback, "POST");
    }
    return fallback;
  }
}
