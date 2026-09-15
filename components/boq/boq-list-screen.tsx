"use client";

import { BoqFilters } from "@/components/boq/boq-filters";
import { BoqList } from "@/components/boq/boq-list";
import { BoqListSkeleton } from "@/components/boq/boq-skeletons";
import { BoqSummaryCards } from "@/components/boq/boq-summary-cards";
import {
  CompactPanel,
  ProjectSectionHeader,
  ProjectSectionPrimaryLink,
} from "@/components/projects/project-section-chrome";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { WithIcon } from "@/components/ui/with-icon";
import { useApiData } from "@/hooks/use-api-data";
import { DEFAULT_PAGE_SIZE } from "@/lib/api/pagination";
import { formatLabourCost } from "@/lib/labour/money";
import type { BoqListResult } from "@/lib/boq/types";
import { cn, formatDate } from "@/lib/utils";
import { Calculator, Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function BoqListScreen({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName?: string;
}) {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = searchParams.get("page") ?? "1";
  const pageSize = searchParams.get("page_size") ?? String(DEFAULT_PAGE_SIZE);

  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status) params.set("status", status);
  params.set("page", page);
  params.set("page_size", pageSize);

  const { data, error, isLoading } = useApiData<BoqListResult>(
    `/api/projects/${projectId}/boq?${params.toString()}`,
  );

  const boqs = data?.boqs ?? [];
  const hasFilters = Boolean(query || status);
  const dashboard = data?.dashboard;
  const sectionPool = [
    ...(dashboard?.top_completed_sections ?? []),
    ...(dashboard?.remaining_sections ?? []),
  ];

  if (isLoading) {
    return <BoqListSkeleton />;
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  return (
    <div className="space-y-4">
      <ProjectSectionHeader
        title="BOQ estimates"
        description={
          projectName
            ? `Track project estimates and work costs for ${projectName}`
            : "Track project quantities, rates, and cost estimates"
        }
        action={
          <ProjectSectionPrimaryLink
            href={`/projects/${projectId}/boq/new`}
            icon={Plus}
          >
            Create BOQ
          </ProjectSectionPrimaryLink>
        }
      />

      {dashboard ? (
        <>
          <BoqSummaryCards summary={dashboard.summary} sections={sectionPool} />
          {dashboard.estimate_vs_actual ? (
            <CompactPanel title="Quote vs actual cost">
              <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                {dashboard.estimate_vs_actual.quotation_value ? (
                  <div className="rounded-lg bg-stone-50 px-2.5 py-2">
                    <dt className="text-stone-500">
                      Quote
                      {dashboard.estimate_vs_actual.quotation_number
                        ? ` ${dashboard.estimate_vs_actual.quotation_number}`
                        : ""}
                    </dt>
                    <dd className="mt-0.5 font-semibold text-stone-900 tabular-nums">
                      {formatLabourCost(
                        dashboard.estimate_vs_actual.quotation_value,
                      )}
                    </dd>
                  </div>
                ) : null}
                <div className="rounded-lg bg-stone-50 px-2.5 py-2">
                  <dt className="text-stone-500">BOQ estimate</dt>
                  <dd className="mt-0.5 font-semibold text-stone-900 tabular-nums">
                    {formatLabourCost(
                      dashboard.estimate_vs_actual.boq_estimated_value,
                    )}
                  </dd>
                </div>
                <div className="rounded-lg bg-amber-50 px-2.5 py-2">
                  <dt className="text-amber-800">Spent so far</dt>
                  <dd className="mt-0.5 font-semibold text-stone-900 tabular-nums">
                    {formatLabourCost(dashboard.estimate_vs_actual.actual_cost)}
                  </dd>
                </div>
              </dl>
            </CompactPanel>
          ) : null}
          {dashboard.recent_measurements.length > 0 ? (
            <CompactPanel title="Recent measurements">
              <ul className="divide-y divide-stone-100">
                {dashboard.recent_measurements.slice(0, 5).map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-2 py-1.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-stone-800">
                        {item.item_description}
                      </p>
                      <p className="text-[11px] text-stone-500">
                        {[formatDate(item.measurement_date), item.location]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs font-semibold text-stone-900 tabular-nums">
                      {item.quantity} {item.unit.replaceAll("_", " ")}
                    </p>
                  </li>
                ))}
              </ul>
            </CompactPanel>
          ) : null}
        </>
      ) : null}

      <BoqFilters />

      {boqs.length === 0 ? (
        <EmptyState
          icon={Calculator}
          title={
            hasFilters ? "No matching BOQ estimates" : "No BOQ estimates yet"
          }
          description={
            hasFilters
              ? "Try a different search or status."
              : "Create a BOQ estimate to plan work quantities, rates, and project cost."
          }
          action={
            hasFilters ? undefined : (
              <Link
                href={`/projects/${projectId}/boq/new`}
                className={cn(linkButtonClassName("primary", "sm"))}
              >
                <WithIcon icon={Plus}>New BOQ</WithIcon>
              </Link>
            )
          }
        />
      ) : (
        <BoqList
          projectId={projectId}
          boqs={boqs}
          pagination={{
            page: data?.page ?? 1,
            pageSize: data?.pageSize ?? DEFAULT_PAGE_SIZE,
            total: data?.total ?? 0,
            totalPages: data?.totalPages ?? 1,
          }}
        />
      )}
    </div>
  );
}
