"use client";

import { requestJson } from "@/lib/api/client";
import {
  apiCacheKey,
  getApiCacheGeneration,
  readApiCache,
  writeApiCache,
} from "@/lib/api/client-cache";
import type { Project } from "@/types";
import { useEffect, useState } from "react";

export function useProject(id: string) {
  const cacheKey = apiCacheKey(`/api/projects/${id}`);
  const cached = readApiCache<{ project: Project }>(cacheKey);

  const [project, setProject] = useState<Project | null>(
    cached?.project ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;
    const existing = readApiCache<{ project: Project }>(cacheKey);

    if (existing) {
      setProject(existing.project);
      setError(null);
      setNotFound(false);
      setIsLoading(false);
      return;
    }

    const requestGeneration = getApiCacheGeneration();

    async function load() {
      setIsLoading(true);
      setError(null);
      setNotFound(false);

      const result = await requestJson<{ project: Project }>(
        `/api/projects/${id}`,
      );

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setNotFound(result.message === "Project not found.");
        setError(
          result.message === "Project not found." ? null : result.message,
        );
        setProject(null);
        setIsLoading(false);
        return;
      }

      if (requestGeneration === getApiCacheGeneration()) {
        writeApiCache(cacheKey, result.data);
      }

      setProject(result.data.project);
      setIsLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [id, cacheKey]);

  return { project, error, notFound, isLoading };
}
