"use client";

import { requestJson } from "@/lib/api/client";
import type { MaterialDetail } from "@/lib/materials/types";
import { useCallback, useEffect, useState } from "react";

export function useMaterial(id: string) {
  const [material, setMaterial] = useState<MaterialDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    const result = await requestJson<{ material: MaterialDetail }>(
      `/api/materials/${id}`,
    );

    if (!result.ok) {
      setNotFound(result.message === "Material not found.");
      setError(result.message === "Material not found." ? null : result.message);
      setMaterial(null);
      return;
    }

    setNotFound(false);
    setError(null);
    setMaterial(result.data.material);
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      setNotFound(false);

      const result = await requestJson<{ material: MaterialDetail }>(
        `/api/materials/${id}`,
      );

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setNotFound(result.message === "Material not found.");
        setError(
          result.message === "Material not found." ? null : result.message,
        );
        setMaterial(null);
        setIsLoading(false);
        return;
      }

      setMaterial(result.data.material);
      setIsLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { material, error, notFound, isLoading, reload };
}
