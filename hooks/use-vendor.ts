"use client";

import { requestJson } from "@/lib/api/client";
import type { VendorDetail } from "@/lib/vendors/types";
import { useCallback, useEffect, useState } from "react";

export function useVendor(id: string) {
  const [vendor, setVendor] = useState<VendorDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    const result = await requestJson<{ vendor: VendorDetail }>(
      `/api/vendors/${id}`,
    );

    if (!result.ok) {
      setNotFound(result.message === "Vendor not found.");
      setError(result.message === "Vendor not found." ? null : result.message);
      setVendor(null);
      return;
    }

    setNotFound(false);
    setError(null);
    setVendor(result.data.vendor);
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      setNotFound(false);

      const result = await requestJson<{ vendor: VendorDetail }>(
        `/api/vendors/${id}`,
      );

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setNotFound(result.message === "Vendor not found.");
        setError(
          result.message === "Vendor not found." ? null : result.message,
        );
        setVendor(null);
        setIsLoading(false);
        return;
      }

      setVendor(result.data.vendor);
      setIsLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { vendor, error, notFound, isLoading, reload };
}
