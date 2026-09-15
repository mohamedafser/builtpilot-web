"use client";

import { MaterialTransactionList } from "@/components/materials/material-transaction-list";
import { AssignVendorToProjectsDialog } from "@/components/vendors/assign-vendor-to-projects-dialog";
import { VendorActions } from "@/components/vendors/vendor-actions";
import { CatalogStatusBadge, ExpenseCategoryBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useDisclosure } from "@/hooks/use-disclosure";
import { formatMaterialCost } from "@/lib/materials/stock";
import { formatLabourCost } from "@/lib/labour/money";
import type { VendorDetail } from "@/lib/vendors/types";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";
import Link from "next/link";

export function VendorDetail({
  vendor,
  onAssigned,
}: {
  vendor: VendorDetail;
  onAssigned?: () => void;
}) {
  const { isOpen, open, close } = useDisclosure();
  const canAssign = vendor.status === "active";
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-stone-900">
                {vendor.name}
              </h2>
              <CatalogStatusBadge status={vendor.status} />
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-stone-500">Contact person</dt>
                <dd className="mt-0.5 font-medium text-stone-800">
                  {vendor.contact_person || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Phone</dt>
                <dd className="mt-0.5 font-medium text-stone-800">
                  {vendor.phone || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Email</dt>
                <dd className="mt-0.5 font-medium text-stone-800">
                  {vendor.email || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Added</dt>
                <dd className="mt-0.5 font-medium text-stone-800">
                  {formatDate(vendor.created_at.slice(0, 10))}
                </dd>
              </div>
            </dl>
            {vendor.address ? (
              <p className="mt-4 text-sm text-stone-600">{vendor.address}</p>
            ) : null}
          </div>
          <VendorActions
            vendorId={vendor.id}
            vendorName={vendor.name}
            status={vendor.status}
            showView={false}
            layout="stack"
          />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-stone-500">Total purchases</p>
          <p className="mt-1 text-xl font-semibold text-stone-900">
            {vendor.purchase_count}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-stone-500">Total purchase cost</p>
          <p className="mt-1 text-xl font-semibold text-stone-900">
            {formatMaterialCost(vendor.total_purchase_cost)}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-stone-500">Other expenses</p>
          <p className="mt-1 text-xl font-semibold text-stone-900">
            {vendor.expense_count}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-stone-500">Other expense cost</p>
          <p className="mt-1 text-xl font-semibold text-stone-900">
            {formatLabourCost(vendor.total_expense_cost)}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 whitespace-pre-wrap text-stone-700">
            {vendor.notes || "No notes added yet."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Projects supplied</CardTitle>
          {canAssign && vendor.projects_supplied.length > 0 ? (
            <Button onClick={open} className="h-12 sm:h-10" icon={Plus}>
              Add project
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {vendor.projects_supplied.length === 0 ? (
            <EmptyState
              title="No projects yet."
              description={
                canAssign
                  ? "Add this vendor to a project, then receive material to start tracking purchases."
                  : "Reactivate this vendor before adding them to a project."
              }
              action={
                canAssign ? (
                  <Button onClick={open} className="h-12 sm:h-10" icon={Plus}>
                    Add project
                  </Button>
                ) : null
              }
              className="border-0 bg-transparent py-10"
            />
          ) : (
            <ul className="divide-y divide-stone-100">
              {vendor.projects_supplied.map((row) => (
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
                    {row.purchase_count} purchases ·{" "}
                    {formatMaterialCost(row.total_cost)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent purchases</CardTitle>
        </CardHeader>
        <CardContent>
          <MaterialTransactionList
            transactions={vendor.recent_purchases}
            emptyTitle="No purchases recorded."
            emptyDescription="Receive materials from this vendor to build purchase history."
            showMaterial
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Other expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {vendor.recent_expenses.length === 0 ? (
            <EmptyState
              title="No other expenses yet."
              description="Expenses linked to this vendor will appear here."
              className="border-0 bg-transparent py-10"
            />
          ) : (
            <ul className="divide-y divide-stone-100">
              {vendor.recent_expenses.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <Link
                      href={`/projects/${row.project_id}/expenses/${row.id}`}
                      className="font-medium text-stone-900 hover:text-amber-700"
                    >
                      {row.description}
                    </Link>
                    <p className="mt-1 text-xs text-stone-500">
                      {row.project_name} · {formatDate(row.expense_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ExpenseCategoryBadge category={row.category} />
                    <p className="text-sm font-medium text-stone-800">
                      {formatLabourCost(row.amount)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AssignVendorToProjectsDialog
        vendorId={vendor.id}
        vendorName={vendor.name}
        open={isOpen}
        onClose={close}
        onAssigned={() => onAssigned?.()}
      />
    </div>
  );
}
