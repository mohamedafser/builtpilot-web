"use client";

import { QuotationDetailView } from "@/components/quotations/quotation-detail";
import { QuotationDetailSkeleton } from "@/components/quotations/quotation-skeletons";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requestJson } from "@/lib/api/client";
import type { QuotationDetail } from "@/lib/quotations/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export function QuotationDetailScreen({ quotationId }: { quotationId: string }) {
  const [quotation, setQuotation] = useState<QuotationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
    }
    setError(null);
    const result = await requestJson<{ quotation: QuotationDetail }>(
      `/api/quotations/${quotationId}`,
    );

    if (!result.ok) {
      setQuotation(null);
      setError(result.message);
      setIsLoading(false);
      return;
    }

    setQuotation(result.data.quotation);
    setIsLoading(false);
  }, [quotationId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return <QuotationDetailSkeleton />;
  }

  if (error === "Quotation not found.") {
    return (
      <EmptyState
        title="Quotation not found"
        description="This quotation does not exist or you do not have access to it."
        action={
          <Link
            href="/quotations"
            className={cn(linkButtonClassName("secondary"))}
          >
            Back to quotations
          </Link>
        }
      />
    );
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (!quotation) {
    return null;
  }

  return (
    <QuotationDetailView
      quotation={quotation}
      onUpdated={() => void load({ silent: true })}
    />
  );
}
