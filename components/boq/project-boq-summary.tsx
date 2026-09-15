"use client";

import { BoqStatusBadge } from "@/components/ui/badge";
import { linkButtonClassName } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/use-api-data";
import { formatCompletionPercent } from "@/lib/boq/calculations";
import type { BoqListResult } from "@/lib/boq/types";
import { formatLabourCost } from "@/lib/labour/money";
import { WithIcon } from "@/components/ui/with-icon";
import { cn } from "@/lib/utils";
import { ClipboardList } from "lucide-react";
import Link from "next/link";

export function ProjectBoqSummary({ projectId }: { projectId: string }) {
  const { data, error, isLoading } = useApiData<BoqListResult>(
    `/api/projects/${projectId}/boq?page_size=1`,
  );

  if (isLoading) {
    return <Skeleton className="h-40 w-full rounded-xl" />;
  }

  if (error || !data || data.total === 0) {
    return null;
  }

  const latest = data.boqs[0];
  const summary = data.dashboard.summary;
  const comparison = data.dashboard.estimate_vs_actual;

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-stone-900">
            BOQ / Measurements
          </h3>
          <p className="mt-1 text-sm text-stone-500">
            Estimated work versus actual project cost from labour, materials,
            and expenses.
          </p>
          {latest ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                href={`/projects/${projectId}/boq/${latest.id}`}
                className="font-medium text-amber-700 hover:text-amber-800"
              >
                {latest.name}
              </Link>
              <BoqStatusBadge status={latest.status} />
            </div>
          ) : null}
        </div>
        <Link
          href={`/projects/${projectId}/boq`}
          className={cn(linkButtonClassName("secondary"), "h-12 sm:h-10")}
        >
          <WithIcon icon={ClipboardList}>View BOQ</WithIcon>
        </Link>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        {comparison?.quotation_value ? (
          <div className="rounded-lg border border-stone-100 bg-stone-50 p-4">
            <dt className="text-sm text-stone-500">Quotation</dt>
            <dd className="mt-1 text-xl font-semibold text-stone-900">
              {formatLabourCost(comparison.quotation_value)}
            </dd>
          </div>
        ) : null}
        <div className="rounded-lg border border-stone-100 bg-stone-50 p-4">
          <dt className="text-sm text-stone-500">BOQ estimate</dt>
          <dd className="mt-1 text-xl font-semibold text-stone-900">
            {formatLabourCost(summary.estimated_value)}
          </dd>
        </div>
        <div className="rounded-lg border border-stone-100 bg-stone-50 p-4">
          <dt className="text-sm text-stone-500">Completed</dt>
          <dd className="mt-1 text-xl font-semibold text-stone-900">
            {formatLabourCost(summary.completed_value)}
          </dd>
          <p className="mt-1 text-xs text-stone-500">
            {formatCompletionPercent(summary.completion_percentage)} complete
          </p>
        </div>
        {comparison ? (
          <div className="rounded-lg border border-stone-100 bg-stone-50 p-4">
            <dt className="text-sm text-stone-500">Actual cost</dt>
            <dd className="mt-1 text-xl font-semibold text-stone-900">
              {formatLabourCost(comparison.actual_cost)}
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
