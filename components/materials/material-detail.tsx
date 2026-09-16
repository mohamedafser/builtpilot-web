"use client";

import { AssignMaterialToProjectsDialog } from "@/components/materials/assign-material-to-projects-dialog";
import { MaterialActions } from "@/components/materials/material-actions";
import {
  MaterialDetailCharts,
  MaterialStatStrip,
} from "@/components/materials/material-detail-charts";
import { MaterialTransactionList } from "@/components/materials/material-transaction-list";
import {
  CatalogStatusBadge,
  MaterialCategoryBadge,
  StockStatusBadge,
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MATERIAL_UNIT_SHORT_LABELS } from "@/constants/material";
import { useDisclosure } from "@/hooks/use-disclosure";
import {
  formatMaterialCost,
  formatQuantityWithUnit,
} from "@/lib/materials/stock";
import type { MaterialDetail as MaterialDetailType } from "@/lib/materials/types";
import { formatDate } from "@/lib/utils";
import { FolderKanban } from "lucide-react";
import Link from "next/link";

export function MaterialDetail({
  material,
  onAssigned,
}: {
  material: MaterialDetailType;
  onAssigned?: () => void;
}) {
  const { isOpen, open, close } = useDisclosure();
  const canAssign = material.status === "active";

  return (
    <div className="space-y-3">
      <section className="rounded-lg border border-stone-200 bg-white px-3 py-2.5 shadow-sm sm:px-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="truncate text-lg font-semibold text-stone-900">
                {material.name}
              </h2>
              <MaterialCategoryBadge category={material.category} />
              <CatalogStatusBadge status={material.status} />
              <StockStatusBadge status={material.inventory.stock_status} />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-stone-500">
              <span>{MATERIAL_UNIT_SHORT_LABELS[material.unit]}</span>
              <span aria-hidden>·</span>
              <span>
                {formatMaterialCost(material.default_unit_price)} / unit
              </span>
              {material.vendor_id && material.vendor_name ? (
                <>
                  <span aria-hidden>·</span>
                  <Link
                    href={`/vendors/${material.vendor_id}`}
                    className="hover:text-amber-700"
                  >
                    {material.vendor_name}
                  </Link>
                </>
              ) : null}
              {material.minimum_stock ? (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    Min{" "}
                    {formatQuantityWithUnit(
                      material.minimum_stock,
                      material.unit,
                    )}
                  </span>
                </>
              ) : null}
              <span aria-hidden>·</span>
              <span>Added {formatDate(material.created_at.slice(0, 10))}</span>
            </p>
            {material.notes ? (
              <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-stone-600">
                {material.notes}
              </p>
            ) : null}
          </div>
          <MaterialActions
            materialId={material.id}
            materialName={material.name}
            status={material.status}
            showView={false}
            compact
            layout="row"
          />
        </div>
      </section>

      <MaterialStatStrip
        items={[
          {
            label: "On hand",
            value: formatQuantityWithUnit(
              material.inventory.current_stock,
              material.unit,
            ),
            tone:
              material.inventory.stock_status === "low_stock" ||
              material.inventory.stock_status === "out_of_stock"
                ? "warn"
                : "default",
          },
          {
            label: "Received",
            value: formatQuantityWithUnit(
              material.inventory.total_received,
              material.unit,
            ),
          },
          {
            label: "Used",
            value: formatQuantityWithUnit(
              material.inventory.total_used,
              material.unit,
            ),
          },
          {
            label: "Avg price",
            value: formatMaterialCost(material.cost.average_purchase_price),
          },
        ]}
      />

      <MaterialDetailCharts
        inventory={material.inventory}
        projectUsage={material.project_usage}
        recentTransactions={material.recent_transactions}
        unit={material.unit}
        purchasedCost={material.cost.total_purchased_cost}
        usedCost={material.cost.total_used_cost}
        stockValue={material.cost.stock_value}
      />

      <section className="rounded-lg border border-stone-200 bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-3 py-2">
          <h3 className="text-xs font-semibold text-stone-900">
            Project usage
          </h3>
          {canAssign ? (
            <Button
              onClick={open}
              size="sm"
              variant="secondary"
              className="h-8"
              icon={FolderKanban}
            >
              Assign
            </Button>
          ) : null}
        </div>
        <div className="px-3 py-2">
          {material.project_usage.length === 0 ? (
            <EmptyState
              title="Not on a project yet."
              description={
                canAssign
                  ? "Assign this material to receive and track stock."
                  : "Reactivate before assigning to a project."
              }
              action={
                canAssign ? (
                  <Button
                    onClick={open}
                    size="sm"
                    className="h-8"
                    icon={FolderKanban}
                  >
                    Assign to project
                  </Button>
                ) : null
              }
              className="border-0 bg-transparent py-6"
            />
          ) : (
            <ul className="divide-y divide-stone-100">
              {material.project_usage.map((row) => (
                <li
                  key={row.project_id}
                  className="flex items-center justify-between gap-3 py-1.5 first:pt-0 last:pb-0"
                >
                  <Link
                    href={`/projects/${row.project_id}/materials`}
                    className="truncate text-[13px] font-medium text-stone-900 hover:text-amber-700"
                  >
                    {row.project_name}
                  </Link>
                  <p className="shrink-0 text-[11px] tabular-nums text-stone-500">
                    {formatQuantityWithUnit(row.current_stock, material.unit)}
                    {" · "}
                    used {formatQuantityWithUnit(row.total_used, material.unit)}
                    {" · "}
                    {formatMaterialCost(row.total_purchased_cost)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white">
        <div className="border-b border-stone-100 px-3 py-2">
          <h3 className="text-xs font-semibold text-stone-900">
            Recent transactions
          </h3>
        </div>
        <div className="p-2 sm:p-3">
          <MaterialTransactionList
            transactions={material.recent_transactions}
            emptyTitle="No transactions yet."
            emptyDescription="Receive or use this material on a project to start tracking stock."
            compact
          />
        </div>
      </section>

      <AssignMaterialToProjectsDialog
        materialId={material.id}
        materialName={material.name}
        open={isOpen}
        onClose={close}
        onAssigned={() => onAssigned?.()}
      />
    </div>
  );
}
