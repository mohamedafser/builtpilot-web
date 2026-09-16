"use client";

import { TransactionTypeBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  formatMaterialCost,
  formatQuantityWithUnit,
} from "@/lib/materials/stock";
import type { MaterialTransactionListItem } from "@/lib/materials/types";
import { cn, formatDate } from "@/lib/utils";
import Link from "next/link";

export function MaterialTransactionList({
  transactions,
  emptyTitle,
  emptyDescription,
  showMaterial = false,
  compact = false,
}: {
  transactions: MaterialTransactionListItem[];
  emptyTitle: string;
  emptyDescription: string;
  showMaterial?: boolean;
  compact?: boolean;
}) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        className={cn("border-0 bg-transparent", compact ? "py-5" : "py-8")}
      />
    );
  }

  const cellPad = compact ? "px-2.5 py-1.5" : "px-4 py-3";
  const textSize = compact ? "text-[12px]" : "text-sm";

  return (
    <>
      <div
        className={cn(
          "hidden overflow-hidden border border-stone-200 md:block",
          compact ? "rounded-md" : "rounded-xl",
        )}
      >
        <div className="overflow-x-auto">
          <table className={cn("min-w-full text-left", textSize)}>
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className={cn(cellPad, "font-medium")}>Date</th>
                {showMaterial ? (
                  <th className={cn(cellPad, "font-medium")}>Material</th>
                ) : null}
                <th className={cn(cellPad, "font-medium")}>Project</th>
                {!compact ? (
                  <th className={cn(cellPad, "font-medium")}>Vendor</th>
                ) : null}
                <th className={cn(cellPad, "font-medium")}>Type</th>
                <th className={cn(cellPad, "font-medium")}>Quantity</th>
                {!compact ? (
                  <th className={cn(cellPad, "font-medium")}>Unit price</th>
                ) : null}
                <th className={cn(cellPad, "font-medium")}>Total</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((row) => (
                <tr key={row.id} className="border-t border-stone-100">
                  <td
                    className={cn(cellPad, "whitespace-nowrap text-stone-600")}
                  >
                    {formatDate(row.transaction_date)}
                  </td>
                  {showMaterial ? (
                    <td className={cellPad}>
                      <Link
                        href={`/materials/${row.material_id}`}
                        className="font-medium text-stone-900 hover:text-amber-700"
                      >
                        {row.material_name}
                      </Link>
                    </td>
                  ) : null}
                  <td className={cellPad}>
                    <Link
                      href={`/projects/${row.project_id}/materials`}
                      className="text-stone-800 hover:text-amber-700"
                    >
                      {row.project_name}
                    </Link>
                  </td>
                  {!compact ? (
                    <td className={cn(cellPad, "text-stone-600")}>
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
                  ) : null}
                  <td className={cellPad}>
                    <TransactionTypeBadge type={row.transaction_type} />
                  </td>
                  <td
                    className={cn(cellPad, "whitespace-nowrap text-stone-600")}
                  >
                    {formatQuantityWithUnit(row.quantity, row.material_unit)}
                    {row.adjustment_direction
                      ? ` (${row.adjustment_direction})`
                      : ""}
                  </td>
                  {!compact ? (
                    <td
                      className={cn(
                        cellPad,
                        "whitespace-nowrap text-stone-600",
                      )}
                    >
                      {formatMaterialCost(row.unit_price)}
                    </td>
                  ) : null}
                  <td
                    className={cn(cellPad, "whitespace-nowrap text-stone-600")}
                  >
                    {formatMaterialCost(row.total_cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={cn("md:hidden", compact ? "space-y-1.5" : "space-y-3")}>
        {transactions.map((row) => (
          <article
            key={row.id}
            className={cn(
              "border border-stone-200 bg-white shadow-sm",
              compact ? "rounded-md px-2.5 py-2" : "rounded-xl p-4",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className={cn(
                    "font-medium text-stone-900",
                    compact ? "truncate text-[12px]" : "text-sm",
                  )}
                >
                  {showMaterial ? row.material_name : row.project_name}
                </p>
                <p className="mt-0.5 text-[10px] text-stone-500">
                  {formatDate(row.transaction_date)}
                </p>
              </div>
              <TransactionTypeBadge type={row.transaction_type} />
            </div>
            <dl
              className={cn(
                "mt-2 grid grid-cols-2 gap-2",
                compact ? "text-[11px]" : "text-sm",
              )}
            >
              <div>
                <dt className="text-stone-500">Quantity</dt>
                <dd className="mt-0.5 font-medium tabular-nums text-stone-800">
                  {formatQuantityWithUnit(row.quantity, row.material_unit)}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Total</dt>
                <dd className="mt-0.5 font-medium tabular-nums text-stone-800">
                  {formatMaterialCost(row.total_cost)}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </>
  );
}
