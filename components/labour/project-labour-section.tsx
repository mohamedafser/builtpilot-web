"use client";

import { Card, CardContent } from "@/components/ui/card";
import { linkButtonClassName } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WithIcon } from "@/components/ui/with-icon";
import { useApiData } from "@/hooks/use-api-data";
import { formatLabourCost, startOfMonthIso, todayIsoDate } from "@/lib/labour/money";
import type { ProjectLabourDashboard } from "@/lib/labour/types";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";
import { Users } from "lucide-react";
import Link from "next/link";

export function ProjectLabourSection({ project }: { project: Project }) {
  const today = todayIsoDate();
  const from = startOfMonthIso(today);
  const { data, error, isLoading } = useApiData<ProjectLabourDashboard>(
    `/api/projects/${project.id}/labour?date=${today}&from=${from}&to=${today}`,
  );

  const stats = [
    {
      label: "Total workers",
      value: String(data?.today.assigned_workers ?? 0),
    },
    {
      label: "Active workers",
      value: String(data?.today.active_workers ?? 0),
    },
    {
      label: "Today's attendance",
      value: String(
        (data?.today.present ?? 0) + (data?.today.half_day ?? 0),
      ),
    },
    {
      label: "Today's labour cost",
      value: formatLabourCost(data?.today.labour_cost ?? "0.00"),
    },
  ];

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-stone-900">Labour</h3>
            <p className="mt-1 text-sm text-stone-500">
              Assigned crew, today&apos;s attendance, and this month&apos;s
              labour cost.
            </p>
          </div>
          <Link
            href={`/projects/${project.id}/labour`}
            className={cn(linkButtonClassName(), "h-12 sm:h-10")}
          >
            <WithIcon icon={Users}>Manage labour</WithIcon>
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
                Labour summary
              </h3>
              <p className="mt-1 text-sm text-stone-500">This month</p>
            </div>
            <Link
              href={`/projects/${project.id}/labour`}
              className="text-sm font-medium text-amber-700 hover:text-amber-800"
            >
              View labour
            </Link>
          </div>
          {isLoading ? (
            <p className="mt-4 text-sm text-stone-500">Loading summary...</p>
          ) : !data ? (
            <p className="mt-4 text-sm text-stone-500">
              No labour recorded yet.
            </p>
          ) : (
            <>
              <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-sm text-stone-500">Labour cost</dt>
                  <dd className="mt-1 text-lg font-semibold text-stone-900">
                    {formatLabourCost(data.summary.total_labour_cost)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-stone-500">Worker days</dt>
                  <dd className="mt-1 text-lg font-semibold text-stone-900">
                    {data.summary.total_labour_days}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-stone-500">Average workers</dt>
                  <dd className="mt-1 text-lg font-semibold text-stone-900">
                    {data.summary.average_workers_per_day}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 border-t border-stone-100 pt-4">
                <h4 className="text-sm font-medium text-stone-500">
                  Top worker roles
                </h4>
                {data.summary.top_roles.length === 0 ? (
                  <p className="mt-2 text-sm text-stone-500">
                    No attendance recorded this month.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {data.summary.top_roles.map((role) => (
                      <li
                        key={role.role}
                        className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700"
                      >
                        {role.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
