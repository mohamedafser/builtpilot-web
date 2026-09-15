"use client";

import { requestJson } from "@/lib/api/client";
import type { WorkerDetail } from "@/lib/workers/types";
import { useCallback, useEffect, useState } from "react";

export function useWorker(id: string) {
  const [worker, setWorker] = useState<WorkerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    const result = await requestJson<{ worker: WorkerDetail }>(
      `/api/workers/${id}`,
    );

    if (!result.ok) {
      setNotFound(result.message === "Worker not found.");
      setError(result.message === "Worker not found." ? null : result.message);
      setWorker(null);
      return;
    }

    setNotFound(false);
    setError(null);
    setWorker(result.data.worker);
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      setNotFound(false);

      const result = await requestJson<{ worker: WorkerDetail }>(
        `/api/workers/${id}`,
      );

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setNotFound(result.message === "Worker not found.");
        setError(
          result.message === "Worker not found." ? null : result.message,
        );
        setWorker(null);
        setIsLoading(false);
        return;
      }

      setWorker(result.data.worker);
      setIsLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { worker, error, notFound, isLoading, reload };
}
