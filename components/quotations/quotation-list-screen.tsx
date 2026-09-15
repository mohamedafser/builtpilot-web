"use client";

import {
  CompactStatStrip,
  ProjectSectionHeader,
  ProjectSectionPrimaryLink,
} from "@/components/projects/project-section-chrome";
import { QuotationFilters } from "@/components/quotations/quotation-filters";
import { QuotationList } from "@/components/quotations/quotation-list";
import { QuotationListSkeleton } from "@/components/quotations/quotation-skeletons";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { WithIcon } from "@/components/ui/with-icon";
import { DEFAULT_PAGE_SIZE } from "@/lib/api/pagination";
import { useApiData } from "@/hooks/use-api-data";
import { formatLabourCost } from "@/lib/labour/money";
import type { QuotationListResult } from "@/lib/quotations/types";
import { cn } from "@/lib/utils";
import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function QuotationListScreen({
  projectId,
  projectName,
}: {
  projectId?: string;
  projectName?: string;
}) {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const preset = searchParams.get("preset") ?? "all";
  const from = preset === "all" ? "" : (searchParams.get("from") ?? "");
  const to = preset === "all" ? "" : (searchParams.get("to") ?? "");
  const status = searchParams.get("status") ?? "";
  const page = searchParams.get("page") ?? "1";
  const pageSize = searchParams.get("page_size") ?? String(DEFAULT_PAGE_SIZE);

  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (status) params.set("status", status);
  params.set("page", page);
  params.set("page_size", pageSize);

  const endpoint = projectId
    ? `/api/projects/${projectId}/quotations?${params.toString()}`
    : `/api/quotations?${params.toString()}`;
  const createHref = projectId
    ? `/projects/${projectId}/quotations/new`
    : "/quotations/new";
  const blankHref = projectId
    ? `/projects/${projectId}/quotations/new?mode=blank`
    : "/quotations/new?mode=blank";

  const { data, error, isLoading } = useApiData<QuotationListResult>(endpoint);

  const quotations = data?.quotations ?? [];
  const total = data?.total ?? 0;
  const hasFilters = Boolean(query || from || to || status);

  return (
    <div className="space-y-4">
      <ProjectSectionHeader
        title="Quotations"
        description={
          projectName
            ? `Estimates for ${projectName}`
            : "Create, send, and track client estimates"
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href={blankHref}
              className={cn(linkButtonClassName("secondary", "sm"))}
            >
              <WithIcon icon={ClipboardList}>Blank quotation</WithIcon>
            </Link>
            <ProjectSectionPrimaryLink href={createHref} icon={Plus}>
              Create quotation
            </ProjectSectionPrimaryLink>
          </div>
        }
      />

      <CompactStatStrip
        stats={[
          {
            label: "Total",
            value: String(data?.stats.total ?? 0),
          },
          {
            label: "Draft",
            value: String(data?.stats.draft ?? 0),
          },
          {
            label: "Sent",
            value: String(data?.stats.sent ?? 0),
            tone: "accent",
          },
          {
            label: "Accepted",
            value: String(data?.stats.accepted ?? 0),
            tone: "good",
          },
          {
            label: "Accepted value",
            value: formatLabourCost(data?.stats.accepted_value ?? "0.00"),
            tone: "good",
          },
        ]}
      />

      <QuotationFilters />

      {isLoading ? (
        <QuotationListSkeleton />
      ) : error ? (
        <Alert variant="error">{error}</Alert>
      ) : total === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No quotations yet."
          description={
            hasFilters
              ? "No quotations match these filters."
              : "Create a quotation from a country template, or start blank."
          }
          action={
            hasFilters ? null : (
              <Link
                href={createHref}
                className={cn(linkButtonClassName("primary", "sm"))}
              >
                <WithIcon icon={Plus}>Create quotation</WithIcon>
              </Link>
            )
          }
        />
      ) : (
        <QuotationList
          quotations={quotations}
          pagination={{
            page: data?.page ?? 1,
            pageSize: data?.pageSize ?? DEFAULT_PAGE_SIZE,
            total,
            totalPages: data?.totalPages ?? 1,
          }}
        />
      )}
    </div>
  );
}
