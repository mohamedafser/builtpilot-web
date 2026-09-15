"use client";

import { requestJson } from "@/lib/api/client";
import {
  apiCacheKey,
  getApiCacheGeneration,
  readApiCache,
  writeApiCache,
} from "@/lib/api/client-cache";
import { useEffect, useState } from "react";

export function useApiData<T>(url: string | null) {
  const cacheKey = url ? apiCacheKey(url) : null;
  const cached = cacheKey ? readApiCache<T>(cacheKey) : null;

  const [data, setData] = useState<T | null>(cached);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(url) && !cached);

  useEffect(() => {
    if (!url || !cacheKey) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const existing = readApiCache<T>(cacheKey);

    if (existing) {
      setData(existing);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const requestGeneration = getApiCacheGeneration();
    setIsLoading(true);
    setError(null);

    void requestJson<T>(url).then((result) => {
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setData(null);
        setError(result.message);
        setIsLoading(false);
        return;
      }

      if (requestGeneration === getApiCacheGeneration()) {
        writeApiCache(cacheKey, result.data);
      }

      setData(result.data);
      setError(null);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [url, cacheKey]);

  return { data, error, isLoading };
}
