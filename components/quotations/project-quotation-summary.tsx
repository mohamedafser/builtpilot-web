"use client";

import { EstimateVsActualCard } from "@/components/quotations/estimate-vs-actual";
import { QuotationStatusBadge } from "@/components/ui/badge";
import { linkButtonClassName } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WithIcon } from "@/components/ui/with-icon";
import { useApiData } from "@/hooks/use-api-data";
import type { EstimateVsActual, QuotationListItem } from "@/lib/quotations/types";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import Link from "next/link";

type SummaryResponse = {
  quotation: QuotationListItem | null;
  estimate_vs_actual: EstimateVsActual | null;
};

export function ProjectQuotationSummary({ projectId }: { projectId: string }) {
  const { data, error, isLoading } = useApiData<SummaryResponse>(
    `/api/projects/${projectId}/quotations/summary`,
  );

  if (isLoading) {
    return <Skeleton className="h-28 w-full rounded-xl" />;
  }

  if (error || !data?.quotation) {
    return null;
  }

  const quotationsLink = (
    <Link
      href={`/projects/${projectId}/quotations`}
      className={cn(linkButtonClassName("secondary", "sm"))}
    >
      <WithIcon icon={FileText}>Quotations</WithIcon>
    </Link>
  );

  if (!data.estimate_vs_actual) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-900">Accepted quote</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Link
              href={`/quotations/${data.quotation.id}`}
              className="text-sm font-medium text-amber-700 hover:text-amber-800"
            >
              {data.quotation.quotation_number}
            </Link>
            <QuotationStatusBadge status={data.quotation.effective_status} />
          </div>
        </div>
        {quotationsLink}
      </div>
    );
  }

  return (
    <EstimateVsActualCard
      quotationNumber={data.quotation.quotation_number}
      comparison={data.estimate_vs_actual}
      compact
      action={quotationsLink}
    />
  );
}
