"use client";

import { AssignMaterialToProjectsDialog } from "@/components/materials/assign-material-to-projects-dialog";
import { MaterialActions } from "@/components/materials/material-actions";
import { MaterialTransactionList } from "@/components/materials/material-transaction-list";
import {
  CatalogStatusBadge,
  MaterialCategoryBadge,
  StockStatusBadge,
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MATERIAL_UNIT_LABELS } from "@/constants/material";
import { useDisclosure } from "@/hooks/use-disclosure";
import {
  formatMaterialCost,
  formatQuantityWithUnit,
} from "@/lib/materials/stock";
import type { MaterialDetail } from "@/lib/materials/types";
import { formatDate } from "@/lib/utils";
import { FolderKanban } from "lucide-react";
import Link from "next/link";

export function MaterialDetail({
  material,
  onAssigned,
}: {
  material: MaterialDetail;
  onAssigned?: () => void;
}) {
  const { isOpen, open, close } = useDisclosure();
  const canAssign = material.status === "active";
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-stone-900">
                {material.name}
              </h2>
              <MaterialCategoryBadge category={material.category} />
              <CatalogStatusBadge status={material.status} />
              <StockStatusBadge status={material.inventory.stock_status} />
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-stone-500">Unit</dt>
                <dd className="mt-0.5 font-medium text-stone-800">
                  {MATERIAL_UNIT_LABELS[material.unit]}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Default price</dt>
                <dd className="mt-0.5 font-medium text-stone-800">
                  {formatMaterialCost(material.default_unit_price)}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Vendor</dt>
                <dd className="mt-0.5 font-medium text-stone-800">
                  {material.vendor_id && material.vendor_name ? (
                    <Link
                      href={`/vendors/${material.vendor_id}`}
                      className="hover:text-amber-700"
                    >
                      {material.vendor_name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Minimum stock</dt>
                <dd className="mt-0.5 font-medium text-stone-800">
                  {material.minimum_stock
                    ? formatQuantityWithUnit(
                        material.minimum_stock,
                        material.unit,
                      )
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Added</dt>
                <dd className="mt-0.5 font-medium text-stone-800">
                  {formatDate(material.created_at.slice(0, 10))}
                </dd>
              </div>
            </dl>
          </div>
          <MaterialActions
            materialId={material.id}
            materialName={material.name}
            status={material.status}
            showView={false}
            layout="stack"
          />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Current stock",
            value: formatQuantityWithUnit(
              material.inventory.current_stock,
              material.unit,
            ),
          },
          {
            label: "Total received",
            value: formatQuantityWithUnit(
              material.inventory.total_received,
              material.unit,
            ),
          },
          {
            label: "Total used",
            value: formatQuantityWithUnit(
              material.inventory.total_used,
              material.unit,
            ),
          },
          {
            label: "Total returned",
            value: formatQuantityWithUnit(
              material.inventory.total_returned,
              material.unit,
            ),
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <p className="text-sm text-stone-500">{stat.label}</p>
            <p className="mt-1 text-xl font-semibold text-stone-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost summary</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <dt className="text-sm text-stone-500">Total purchased cost</dt>
              <dd className="mt-1 text-lg font-semibold text-stone-900">
                {formatMaterialCost(material.cost.total_purchased_cost)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-stone-500">Used amount</dt>
              <dd className="mt-1 text-lg font-semibold text-stone-900">
                {formatMaterialCost(material.cost.total_used_cost)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-stone-500">Average purchase price</dt>
              <dd className="mt-1 text-lg font-semibold text-stone-900">
                {formatMaterialCost(material.cost.average_purchase_price)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-stone-500">Stock value</dt>
              <dd className="mt-1 text-lg font-semibold text-stone-900">
                {formatMaterialCost(material.cost.stock_value)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 whitespace-pre-wrap text-stone-700">
            {material.notes || "No notes added yet."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Project usage</CardTitle>
          {canAssign && material.project_usage.length > 0 ? (
            <Button onClick={open} className="h-12 sm:h-10" icon={FolderKanban}>
              Assign to project
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {material.project_usage.length === 0 ? (
            <EmptyState
              title="Not used on a project yet."
              description={
                canAssign
                  ? "Assign this material to a project to receive stock and record usage."
                  : "Reactivate this material before assigning it to a project."
              }
              action={
                canAssign ? (
                  <Button onClick={open} className="h-12 sm:h-10" icon={FolderKanban}>
                    Assign to project
                  </Button>
                ) : null
              }
              className="border-0 bg-transparent py-10"
            />
          ) : (
            <ul className="divide-y divide-stone-100">
              {material.project_usage.map((row) => (
                <li
                  key={row.project_id}
                  className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <Link
                    href={`/projects/${row.project_id}/materials`}
                    className="font-medium text-stone-900 hover:text-amber-700"
                  >
                    {row.project_name}
                  </Link>
                  <p className="text-sm text-stone-500">
                    Stock{" "}
                    {formatQuantityWithUnit(row.current_stock, material.unit)}
                    {" · "}
                    Used {formatQuantityWithUnit(row.total_used, material.unit)}
                    {" · "}
                    {formatMaterialCost(row.total_purchased_cost)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <MaterialTransactionList
            transactions={material.recent_transactions}
            emptyTitle="No transactions yet."
            emptyDescription="Receive or use this material on a project to start tracking stock."
          />
        </CardContent>
      </Card>

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
