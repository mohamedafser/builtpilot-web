"use client";

import { Card, CardContent } from "@/components/ui/card";
import { linkButtonClassName } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WithIcon } from "@/components/ui/with-icon";
import { useApiData } from "@/hooks/use-api-data";
import { startOfMonthIso, todayIsoDate } from "@/lib/labour/money";
import { formatMaterialCost } from "@/lib/materials/stock";
import type { ProjectMaterialsDashboard } from "@/lib/materials/types";
import { cn, formatDate } from "@/lib/utils";
import type { Project } from "@/types";
import { Package } from "lucide-react";
import Link from "next/link";

export function ProjectMaterialsSection({ project }: { project: Project }) {
  const today = todayIsoDate();
  const from = startOfMonthIso(today);
  const { data, error, isLoading } = useApiData<ProjectMaterialsDashboard>(
    `/api/projects/${project.id}/materials?from=${from}&to=${today}`,
  );

  const stats = [
    {
      label: "Material cost",
      value: formatMaterialCost(data?.totals.material_cost ?? "0.00"),
    },
    {
      label: "Materials",
      value: String(data?.totals.materials_in_use ?? 0),
    },
    {
      label: "Low stock",
      value: String(data?.totals.low_stock ?? 0),
    },
    {
      label: "Out of stock",
      value: String(data?.totals.out_of_stock ?? 0),
    },
  ];

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-stone-900">Materials</h3>
            <p className="mt-1 text-sm text-stone-500">
              Stock, purchases, and low-stock warnings for this job.
            </p>
          </div>
          <Link
            href={`/projects/${project.id}/materials`}
            className={cn(linkButtonClassName(), "h-12 sm:h-10")}
          >
            <WithIcon icon={Package}>Manage materials</WithIcon>
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
        ) : (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-stone-100 bg-stone-50 p-4"
              >
                <dt className="text-sm text-stone-500">{stat.label}</dt>
                <dd className="mt-1 text-xl font-semibold text-stone-900">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-stone-900">
                Recent material transactions
              </h3>
              <p className="mt-1 text-sm text-stone-500">Latest site receipts and usage</p>
            </div>
            <Link
              href={`/projects/${project.id}/materials`}
              className="text-sm font-medium text-amber-700 hover:text-amber-800"
            >
              View materials
            </Link>
          </div>
          {isLoading ? (
            <p className="mt-4 text-sm text-stone-500">Loading transactions...</p>
          ) : !data || data.recent_transactions.length === 0 ? (
            <p className="mt-4 text-sm text-stone-500">
              No material transactions recorded yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-stone-100">
              {data.recent_transactions.slice(0, 5).map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-900">
                      {row.material_name}
                    </p>
                    <p className="text-xs text-stone-500">
                      {row.transaction_type}
                      {row.vendor_name ? ` · ${row.vendor_name}` : ""}
                    </p>
                  </div>
                  <p className="text-sm text-stone-500">
                    {formatDate(row.transaction_date)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
