"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { linkButtonClassName } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/use-api-data";
import type { ProjectCostDashboard } from "@/lib/costs/types";
import { formatLabourCost } from "@/lib/labour/money";
import { WithIcon } from "@/components/ui/with-icon";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";
import { Wallet } from "lucide-react";
import Link from "next/link";

function percentLabel(value: number | null): string {
  if (value == null) {
    return "—";
  }

  return `${value % 1 === 0 ? String(value) : value.toFixed(1)}%`;
}

export function ProjectCostSummary({ project }: { project: Project }) {
  const { data, error, isLoading } = useApiData<ProjectCostDashboard>(
    `/api/projects/${project.id}/cost`,
  );

  const budgetStatusLabel =
    data?.budget.status === "over_budget"
      ? "Over Budget"
      : data?.budget.status === "within_budget"
        ? "Within Budget"
        : "No estimated budget";

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-stone-900">
              Project cost
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              Labour, materials, and other expenses for this job.
            </p>
          </div>
          <Link
            href={`/projects/${project.id}/expenses`}
            className={cn(linkButtonClassName(), "h-12 sm:h-10")}
          >
            <WithIcon icon={Wallet}>Manage expenses</WithIcon>
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        ) : error ? (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        ) : data ? (
          <>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-stone-100 bg-stone-50 p-4">
                <dt className="text-sm text-stone-500">Labour</dt>
                <dd className="mt-1 text-xl font-semibold text-stone-900">
                  {data.totals.labour_records > 0
                    ? formatLabourCost(data.totals.labour_cost)
                    : "—"}
                </dd>
                {data.totals.labour_records === 0 ? (
                  <p className="mt-1 text-xs text-stone-500">
                    Labour cost will appear once attendance is recorded.
                  </p>
                ) : null}
              </div>
              <div className="rounded-lg border border-stone-100 bg-stone-50 p-4">
                <dt className="text-sm text-stone-500">Materials</dt>
                <dd className="mt-1 text-xl font-semibold text-stone-900">
                  {data.totals.material_records > 0
                    ? formatLabourCost(data.totals.material_cost)
                    : "—"}
                </dd>
                {data.totals.material_records === 0 ? (
                  <p className="mt-1 text-xs text-stone-500">
                    Material cost will appear once material purchases are
                    recorded.
                  </p>
                ) : null}
              </div>
              <div className="rounded-lg border border-stone-100 bg-stone-50 p-4">
                <dt className="text-sm text-stone-500">Other expenses</dt>
                <dd className="mt-1 text-xl font-semibold text-stone-900">
                  {data.totals.expense_records > 0
                    ? formatLabourCost(data.totals.other_expenses)
                    : "—"}
                </dd>
                {data.totals.expense_records === 0 ? (
                  <p className="mt-1 text-xs text-stone-500">
                    No expenses recorded yet.
                  </p>
                ) : null}
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <dt className="text-sm text-amber-800">Total project cost</dt>
                <dd className="mt-1 text-xl font-semibold text-stone-900">
                  {formatLabourCost(data.totals.total_cost)}
                </dd>
              </div>
            </dl>

            {Number(data.totals.total_cost) > 0 ? (
              <div className="mt-4">
                <div className="flex h-2 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="bg-amber-600"
                    style={{ width: `${data.breakdown.labour.percent ?? 0}%` }}
                  />
                  <div
                    className="bg-sky-600"
                    style={{
                      width: `${data.breakdown.materials.percent ?? 0}%`,
                    }}
                  />
                  <div
                    className="bg-emerald-600"
                    style={{
                      width: `${data.breakdown.expenses.percent ?? 0}%`,
                    }}
                  />
                </div>
                <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  {[
                    data.breakdown.labour,
                    data.breakdown.materials,
                    data.breakdown.expenses,
                  ].map((item) => (
                    <li
                      key={item.label}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-stone-600">{item.label}</span>
                      <span className="font-medium text-stone-800">
                        {formatLabourCost(item.amount)} · {percentLabel(item.percent)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project budget</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 rounded-lg" />
          ) : data ? (
            <>
              <dl className="grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-sm text-stone-500">Estimated budget</dt>
                  <dd className="mt-1 text-lg font-semibold text-stone-900">
                    {formatLabourCost(data.budget.estimated_budget)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-stone-500">Actual cost</dt>
                  <dd className="mt-1 text-lg font-semibold text-stone-900">
                    {formatLabourCost(data.budget.actual_cost)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-stone-500">Remaining budget</dt>
                  <dd className="mt-1 text-lg font-semibold text-stone-900">
                    {formatLabourCost(data.budget.remaining_budget)}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                    data.budget.status === "over_budget"
                      ? "bg-red-100 text-red-700"
                      : data.budget.status === "within_budget"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-stone-100 text-stone-600",
                  )}
                >
                  {budgetStatusLabel}
                </span>
                {data.budget.budget_used_percent != null ? (
                  <span className="text-sm text-stone-500">
                    {percentLabel(data.budget.budget_used_percent)} of budget used
                  </span>
                ) : null}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
