"use client";

import { WorkerActions } from "@/components/workers/worker-actions";
import { WorkerRoleBadge, WorkerStatusBadge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import type { PaginationMeta } from "@/lib/api/pagination";
import { formatLabourCost } from "@/lib/labour/money";
import type { WorkerListItem } from "@/lib/workers/types";
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
      <div className="mb-3 flex items-center gap-2 md:hidden">
        <SelectAllCheckbox
          assignableIds={assignableIds}
          selectedIds={selectedIds}
          onToggleAll={onToggleAll}
        />
        <span className="text-sm text-stone-600">Select all on this page</span>
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-stone-200 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="w-10 px-4 py-3">
                  <SelectAllCheckbox
                    assignableIds={assignableIds}
                    selectedIds={selectedIds}
                    onToggleAll={onToggleAll}
                  />
                </th>
                <th className="px-4 py-3 font-medium">Worker</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Daily wage</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Assigned projects</th>
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {workers.map((worker) => {
                const inactive = worker.status !== "active";
                const checked = selectedIds.includes(worker.id);

                return (
                  <tr key={worker.id} className="border-t border-stone-100">
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3">
                      <Link
                        href={`/workers/${worker.id}`}
                        className="font-medium text-stone-900 hover:text-amber-700"
                      >
                        {worker.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <WorkerRoleBadge role={worker.role} />
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {worker.phone || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-stone-600">
                      {formatLabourCost(worker.daily_wage)}
                    </td>
                    <td className="px-4 py-3">
                      <WorkerStatusBadge status={worker.status} />
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {assignedLabel(worker)}
                    </td>
                    <td className="px-4 py-3">
                      <WorkerActions
                        workerId={worker.id}
                        workerName={worker.name}
                        status={worker.status}
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

      <div className="space-y-3 md:hidden">
        {workers.map((worker) => {
          const inactive = worker.status !== "active";
          const checked = selectedIds.includes(worker.id);

          return (
            <article
              key={worker.id}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0 accent-amber-600"
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/workers/${worker.id}`}
                        className="text-base font-semibold text-stone-900 hover:text-amber-700"
                      >
                        {worker.name}
                      </Link>
                      <div className="mt-2">
                        <WorkerRoleBadge role={worker.role} />
                      </div>
                    </div>
                    <WorkerStatusBadge status={worker.status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-stone-500">Daily wage</dt>
                      <dd className="mt-0.5 font-medium text-stone-800">
                        {formatLabourCost(worker.daily_wage)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-stone-500">Phone</dt>
                      <dd className="mt-0.5 text-stone-800">
                        {worker.phone || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-stone-500">Projects</dt>
                      <dd className="mt-0.5 text-stone-800">
                        {assignedLabel(worker)}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4">
                    <WorkerActions
                      workerId={worker.id}
                      workerName={worker.name}
                      status={worker.status}
                      layout="stack"
                    />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          {pager}
        </div>
      </div>
    </>
  );
}
