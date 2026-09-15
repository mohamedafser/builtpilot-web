"use client";

import { VendorActions } from "@/components/vendors/vendor-actions";
import { CatalogStatusBadge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import type { PaginationMeta } from "@/lib/api/pagination";
import { formatMaterialCost } from "@/lib/materials/stock";
import type { VendorListItem } from "@/lib/vendors/types";
import Link from "next/link";

export function VendorList({
  vendors,
  pagination,
}: {
  vendors: VendorListItem[];
  pagination: PaginationMeta;
}) {
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
      <div className="hidden overflow-hidden rounded-xl border border-stone-200 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Vendor</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Purchases</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr key={vendor.id} className="border-t border-stone-100">
                  <td className="px-4 py-3">
                    <Link
                      href={`/vendors/${vendor.id}`}
                      className="font-medium text-stone-900 hover:text-amber-700"
                    >
                      {vendor.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {vendor.contact_person || "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {vendor.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {vendor.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {vendor.purchase_count} ·{" "}
                    {formatMaterialCost(vendor.total_purchase_cost)}
                  </td>
                  <td className="px-4 py-3">
                    <CatalogStatusBadge status={vendor.status} />
                  </td>
                  <td className="px-4 py-3">
                    <VendorActions
                      vendorId={vendor.id}
                      vendorName={vendor.name}
                      status={vendor.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pager}
      </div>

      <div className="space-y-3 md:hidden">
        {vendors.map((vendor) => (
          <article
            key={vendor.id}
            className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link
                  href={`/vendors/${vendor.id}`}
                  className="text-base font-semibold text-stone-900 hover:text-amber-700"
                >
                  {vendor.name}
                </Link>
                <p className="mt-1 text-sm text-stone-500">
                  {vendor.contact_person || "No contact person"}
                </p>
              </div>
              <CatalogStatusBadge status={vendor.status} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-stone-500">Phone</dt>
                <dd className="mt-0.5 text-stone-800">{vendor.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Purchases</dt>
                <dd className="mt-0.5 text-stone-800">
                  {vendor.purchase_count}
                </dd>
              </div>
            </dl>
            <div className="mt-4">
              <VendorActions
                vendorId={vendor.id}
                vendorName={vendor.name}
                status={vendor.status}
                layout="stack"
              />
            </div>
          </article>
        ))}
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          {pager}
        </div>
      </div>
    </>
  );
}
