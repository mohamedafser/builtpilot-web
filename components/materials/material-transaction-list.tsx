"use client";

import { TransactionTypeBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMaterialCost, formatQuantityWithUnit } from "@/lib/materials/stock";
import type { MaterialTransactionListItem } from "@/lib/materials/types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export function MaterialTransactionList({
  transactions,
  emptyTitle,
  emptyDescription,
  showMaterial = false,
}: {
  transactions: MaterialTransactionListItem[];
  emptyTitle: string;
  emptyDescription: string;
  showMaterial?: boolean;
}) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        className="border-0 bg-transparent py-8"
      />
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-stone-200 md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                {showMaterial ? (
                  <th className="px-4 py-3 font-medium">Material</th>
                ) : null}
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Quantity</th>
                <th className="px-4 py-3 font-medium">Unit price</th>
                <th className="px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((row) => (
                <tr key={row.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 whitespace-nowrap text-stone-600">
                    {formatDate(row.transaction_date)}
                  </td>
                  {showMaterial ? (
                    <td className="px-4 py-3">
                      <Link
                        href={`/materials/${row.material_id}`}
                        className="font-medium text-stone-900 hover:text-amber-700"
                      >
                        {row.material_name}
                      </Link>
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${row.project_id}/materials`}
                      className="text-stone-800 hover:text-amber-700"
                    >
                      {row.project_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {row.vendor_id ? (
                      <Link
                        href={`/vendors/${row.vendor_id}`}
                        className="hover:text-amber-700"
                      >
                        {row.vendor_name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <TransactionTypeBadge type={row.transaction_type} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-stone-600">
                    {formatQuantityWithUnit(row.quantity, row.material_unit)}
                    {row.adjustment_direction
                      ? ` (${row.adjustment_direction})`
                      : ""}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-stone-600">
                    {formatMaterialCost(row.unit_price)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-stone-600">
                    {formatMaterialCost(row.total_cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {transactions.map((row) => (
          <article
            key={row.id}
            className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-stone-900">
                  {showMaterial ? row.material_name : row.project_name}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {formatDate(row.transaction_date)}
                </p>
              </div>
              <TransactionTypeBadge type={row.transaction_type} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-stone-500">Quantity</dt>
                <dd className="mt-0.5 font-medium text-stone-800">
                  {formatQuantityWithUnit(row.quantity, row.material_unit)}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Total</dt>
                <dd className="mt-0.5 font-medium text-stone-800">
                  {formatMaterialCost(row.total_cost)}
                </dd>
              </div>
              {row.vendor_name ? (
                <div className="col-span-2">
                  <dt className="text-stone-500">Vendor</dt>
                  <dd className="mt-0.5 text-stone-800">{row.vendor_name}</dd>
                </div>
              ) : null}
              {row.notes ? (
                <div className="col-span-2">
                  <dt className="text-stone-500">Notes</dt>
                  <dd className="mt-0.5 text-stone-800">{row.notes}</dd>
                </div>
              ) : null}
            </dl>
          </article>
        ))}
      </div>
    </>
  );
}
