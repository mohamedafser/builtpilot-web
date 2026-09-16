"use client";

import { WorkerActions } from "@/components/workers/worker-actions";
import { WorkerRoleBadge, WorkerStatusBadge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import type { PaginationMeta } from "@/lib/api/pagination";
import { formatLabourCost } from "@/lib/labour/money";
import type { WorkerListItem } from "@/lib/workers/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

function assignedLabel(worker: WorkerListItem): string {
  const names = worker.assigned_projects.map((project) => project.name);

  if (names.length === 0) {
    return "None";
  }

  if (names.length <= 2) {
    return names.join(", ");
  }

  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

function SelectAllCheckbox({
  assignableIds,
  selectedIds,
  onToggleAll,
}: {
  assignableIds: string[];
  selectedIds: string[];
  onToggleAll: () => void;
}) {
  const selectedOnPage = assignableIds.filter((id) => selectedIds.includes(id));
  const allSelected =
    assignableIds.length > 0 && selectedOnPage.length === assignableIds.length;
  const someSelected = selectedOnPage.length > 0 && !allSelected;

  return (
    <input
      type="checkbox"
      className="h-4 w-4 accent-amber-600"
      checked={allSelected}
      disabled={assignableIds.length === 0}
      aria-label="Select all workers on this page"
      ref={(element) => {
        if (element) {
          element.indeterminate = someSelected;
        }
      }}
      onChange={onToggleAll}
    />
  );
}

export function WorkerList({
  workers,
  pagination,
  selectedIds,
  onToggleWorker,
  onToggleAll,
}: {
  workers: WorkerListItem[];
  pagination: PaginationMeta;
  selectedIds: string[];
  onToggleWorker: (worker: WorkerListItem) => void;
  onToggleAll: () => void;
}) {
  const assignableIds = workers
    .filter((worker) => worker.status === "active")
    .map((worker) => worker.id);

  const pager = (
    <Pagination
      page={pagination.page}
      pageSize={pagination.pageSize}
      total={pagination.total}
      totalPages={pagination.totalPages}
    />
  );

  return (
    <>
      <div className="mb-2 flex items-center gap-2 md:hidden">
        <SelectAllCheckbox
          assignableIds={assignableIds}
          selectedIds={selectedIds}
          onToggleAll={onToggleAll}
        />
        <span className="text-xs text-stone-600">Select all on this page</span>
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-stone-200 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
              <tr>
                <th className="w-10 px-3 py-2">
                  <SelectAllCheckbox
                    assignableIds={assignableIds}
                    selectedIds={selectedIds}
                    onToggleAll={onToggleAll}
                  />
                </th>
                <th className="px-3 py-2 font-medium">Worker</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Phone</th>
                <th className="px-3 py-2 font-medium">Daily wage</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Assigned projects</th>
                <th className="px-3 py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {workers.map((worker) => {
                const inactive = worker.status !== "active";
                const checked = selectedIds.includes(worker.id);
                const hasProjects = worker.assigned_projects.length > 0;

                return (
                  <tr
                    key={worker.id}
                    className={cn(
                      "border-t border-stone-100",
                      hasProjects && "bg-amber-50/25",
                    )}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-amber-600"
                        checked={checked}
                        disabled={inactive}
                        aria-label={`Select ${worker.name}`}
                        title={
                          inactive
                            ? "Inactive workers cannot be assigned"
                            : undefined
                        }
                        onChange={() => onToggleWorker(worker)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/workers/${worker.id}`}
                        className="font-medium text-stone-900 hover:text-amber-700"
                      >
                        {worker.name}
                      </Link>
                      {hasProjects ? (
                        <p className="mt-0.5 text-[11px] font-medium text-amber-800">
                          Assigned to project
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <WorkerRoleBadge role={worker.role} />
                    </td>
                    <td className="px-3 py-2 text-stone-600">
                      {worker.phone || "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-stone-600 tabular-nums">
                      {formatLabourCost(worker.daily_wage)}
                    </td>
                    <td className="px-3 py-2">
                      <WorkerStatusBadge status={worker.status} />
                    </td>
                    <td className="px-3 py-2 text-stone-600">
                      {assignedLabel(worker)}
                    </td>
                    <td className="px-3 py-2">
                      <WorkerActions
                        workerId={worker.id}
                        workerName={worker.name}
                        status={worker.status}
                        showView={false}
                        compact
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pager}
      </div>

      <div className="space-y-2 md:hidden">
        {workers.map((worker) => {
          const inactive = worker.status !== "active";
          const checked = selectedIds.includes(worker.id);
          const hasProjects = worker.assigned_projects.length > 0;

          return (
            <article
              key={worker.id}
              className={cn(
                "rounded-lg border bg-white p-3",
                hasProjects
                  ? "border-amber-200 bg-amber-50/40"
                  : "border-stone-200",
              )}
            >
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-amber-600"
                  checked={checked}
                  disabled={inactive}
                  aria-label={`Select ${worker.name}`}
                  title={
                    inactive
                      ? "Inactive workers cannot be assigned"
                      : undefined
                  }
                  onChange={() => onToggleWorker(worker)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/workers/${worker.id}`}
                        className="text-sm font-semibold text-stone-900 hover:text-amber-700"
                      >
                        {worker.name}
                      </Link>
                      {hasProjects ? (
                        <p className="mt-0.5 text-[11px] font-medium text-amber-800">
                          Assigned to project
                        </p>
                      ) : null}
                      <div className="mt-1">
                        <WorkerRoleBadge role={worker.role} />
                      </div>
                    </div>
                    <WorkerStatusBadge status={worker.status} />
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-stone-500">Daily wage</dt>
                      <dd className="mt-0.5 font-medium text-stone-800 tabular-nums">
                        {formatLabourCost(worker.daily_wage)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-stone-500">Phone</dt>
                      <dd className="mt-0.5 text-stone-800">
                        {worker.phone || "—"}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-stone-500">Projects</dt>
                      <dd className="mt-0.5 text-stone-800">
                        {assignedLabel(worker)}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-2.5">
                    <WorkerActions
                      workerId={worker.id}
                      workerName={worker.name}
                      status={worker.status}
                      showView={false}
                      compact
                      layout="stack"
                    />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          {pager}
        </div>
      </div>
    </>
  );
}
