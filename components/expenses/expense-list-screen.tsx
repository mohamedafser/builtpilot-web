"use client";

import { ExpenseFilters } from "@/components/expenses/expense-filters";
import { ExpenseList } from "@/components/expenses/expense-list";
import { ExpenseListSkeleton } from "@/components/expenses/expense-skeletons";
import { ProjectCostReporting } from "@/components/expenses/project-cost-reporting";
import {
  CompactStatStrip,
  ProjectSectionHeader,
  ProjectSectionPrimaryLink,
} from "@/components/projects/project-section-chrome";
import { Alert } from "@/components/ui/alert";
import { linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { WithIcon } from "@/components/ui/with-icon";
import { DEFAULT_PAGE_SIZE } from "@/lib/api/pagination";
import { useApiData } from "@/hooks/use-api-data";
import type { ExpenseListResult } from "@/lib/expenses/types";
import {
  formatLabourCost,
  startOfMonthIso,
  todayIsoDate,
} from "@/lib/labour/money";
import { cn } from "@/lib/utils";
import { Plus, Wallet } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function ExpenseListScreen({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const preset = searchParams.get("preset") ?? "this_month";
  const today = todayIsoDate();
  const from =
    preset === "all"
      ? ""
      : (searchParams.get("from") ?? startOfMonthIso(today));
  const to = preset === "all" ? "" : (searchParams.get("to") ?? today);
  const category = searchParams.get("category") ?? "";
  const vendorId = searchParams.get("vendor_id") ?? "";
  const paymentMethod = searchParams.get("payment_method") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = searchParams.get("page") ?? "1";
  const pageSize = searchParams.get("page_size") ?? String(DEFAULT_PAGE_SIZE);

  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (category) params.set("category", category);
  if (vendorId) params.set("vendor_id", vendorId);
  if (paymentMethod) params.set("payment_method", paymentMethod);
  if (status) params.set("status", status);
  params.set("page", page);
  params.set("page_size", pageSize);

  const { data, error, isLoading } = useApiData<ExpenseListResult>(
    `/api/projects/${projectId}/expenses?${params.toString()}`,
  );

  const expenses = data?.expenses ?? [];
  const total = data?.total ?? 0;
  const hasFilters = Boolean(
    query || from || to || category || vendorId || paymentMethod || status,
  );

  return (
    <div className="space-y-4">
      <ProjectSectionHeader
        title="Expenses"
        description="Other project costs beyond labour and materials"
        action={
          <ProjectSectionPrimaryLink
            href={`/projects/${projectId}/expenses/new`}
            icon={Plus}
          >
            Add expense
          </ProjectSectionPrimaryLink>
        }
      />

      <CompactStatStrip
        stats={[
          {
            label: "Total",
            value: formatLabourCost(data?.stats.total_amount ?? "0.00"),
          },
          {
            label: "This month",
            value: formatLabourCost(data?.stats.this_month_amount ?? "0.00"),
            tone: "accent",
          },
          {
            label: "Today",
            value: formatLabourCost(data?.stats.today_amount ?? "0.00"),
          },
          {
            label: "Count",
            value: String(data?.stats.active_count ?? 0),
          },
        ]}
      />

      <ExpenseFilters />

      {isLoading ? (
        <ExpenseListSkeleton />
      ) : error ? (
        <Alert variant="error">{error}</Alert>
      ) : total === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No expenses recorded yet."
          description={
            hasFilters
              ? "No expenses match these filters."
              : "Add a transport, fuel, or site cost in under a minute."
          }
          action={
            hasFilters ? null : (
              <Link
                href={`/projects/${projectId}/expenses/new`}
                className={cn(linkButtonClassName("primary", "sm"))}
              >
                <WithIcon icon={Plus}>Add expense</WithIcon>
              </Link>
            )
          }
        />
      ) : (
        <ExpenseList
          projectId={projectId}
          expenses={expenses}
          pagination={{
            page: data?.page ?? 1,
            pageSize: data?.pageSize ?? DEFAULT_PAGE_SIZE,
            total,
            totalPages: data?.totalPages ?? 1,
          }}
        />
      )}

      <ProjectCostReporting projectId={projectId} />
    </div>
  );
}
