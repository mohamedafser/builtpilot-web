"use client";

import { MaterialActions } from "@/components/materials/material-actions";
import {
  MaterialCategoryBadge,
  StockStatusBadge,
} from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { MATERIAL_UNIT_SHORT_LABELS } from "@/constants/material";
import type { PaginationMeta } from "@/lib/api/pagination";
import {
  formatMaterialCost,
  formatQuantityWithUnit,
} from "@/lib/materials/stock";
import type { MaterialListItem } from "@/lib/materials/types";
import { cn } from "@/lib/utils";
import Link from "next/link";

function hasAdjustments(material: MaterialListItem) {
  return (
    Number(material.total_adjusted_increase) > 0 ||
    Number(material.total_adjusted_decrease) > 0
  );
}

function formatAdjustedCell(material: MaterialListItem) {
  const increase = Number(material.total_adjusted_increase);
  const decrease = Number(material.total_adjusted_decrease);
  if (increase <= 0 && decrease <= 0) {
    return "—";
  }

  const parts: string[] = [];
  if (increase > 0) {
    parts.push(
      `+${formatQuantityWithUnit(material.total_adjusted_increase, material.unit)}`,
    );
  }
  if (decrease > 0) {
    parts.push(
      `−${formatQuantityWithUnit(material.total_adjusted_decrease, material.unit)}`,
    );
  }
  return parts.join(" · ");
}

export function MaterialList({
  materials,
  pagination,
}: {
  materials: MaterialListItem[];
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
      <div className="hidden overflow-hidden rounded-lg border border-stone-200 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[13px]">
            <thead className="border-b border-stone-200 bg-stone-50/80 text-[11px] uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-3 py-2 font-medium">Material</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Vendor</th>
                <th className="px-3 py-2 font-medium">Unit</th>
                <th className="px-3 py-2 font-medium">Price / unit</th>
                <th className="px-3 py-2 font-medium">On hand</th>
                <th className="px-3 py-2 font-medium">Adjusted</th>
                <th className="px-3 py-2 font-medium">Min stock</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {materials.map((material) => {
                const adjusted = hasAdjustments(material);
                const lastIncrease =
                  material.last_adjustment?.direction === "increase";
                const lastDecrease =
                  material.last_adjustment?.direction === "decrease";

                return (
                  <tr
                    key={material.id}
                    className={cn(
                      "border-t border-stone-100 align-middle hover:bg-stone-50/70",
                      lastIncrease && "bg-emerald-50/35",
                      lastDecrease && "bg-rose-50/35",
                    )}
                  >
                    <td className="max-w-[14rem] px-3 py-2">
                      <Link
                        href={`/materials/${material.id}`}
                        className="block truncate font-medium text-stone-900 hover:text-amber-700"
                        title={material.name}
                      >
                        {material.name}
                      </Link>
                      {material.last_adjustment ? (
                        <p
                          className={cn(
                            "mt-0.5 text-[11px] font-medium",
                            material.last_adjustment.direction === "increase"
                              ? "text-emerald-800"
                              : "text-rose-800",
                          )}
                        >
                          Stock{" "}
                          {material.last_adjustment.direction === "increase"
                            ? "increased"
                            : "decreased"}{" "}
                          by{" "}
                          {formatQuantityWithUnit(
                            material.last_adjustment.quantity,
                            material.unit,
                          )}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <MaterialCategoryBadge category={material.category} />
                    </td>
                    <td className="max-w-[10rem] truncate px-3 py-2 text-stone-600">
                      {material.vendor_name || "—"}
                    </td>
                    <td className="px-3 py-2 text-stone-600">
                      {MATERIAL_UNIT_SHORT_LABELS[material.unit]}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-stone-700">
                      {material.default_unit_price != null &&
                      material.default_unit_price !== ""
                        ? formatMaterialCost(material.default_unit_price)
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-stone-700">
                      {formatQuantityWithUnit(
                        material.current_stock,
                        material.unit,
                      )}
                    </td>
                    <td
                      className={cn(
                        "whitespace-nowrap px-3 py-2 tabular-nums",
                        adjusted
                          ? "font-medium text-stone-800"
                          : "text-stone-400",
                      )}
                    >
                      {formatAdjustedCell(material)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-stone-600">
                      {material.minimum_stock != null &&
                      material.minimum_stock !== ""
                        ? formatQuantityWithUnit(
                            material.minimum_stock,
                            material.unit,
                          )
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <StockStatusBadge status={material.stock_status} />
                    </td>
                    <td className="px-3 py-2">
                      <MaterialActions
                        materialId={material.id}
                        materialName={material.name}
                        status={material.status}
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
        {materials.map((material) => {
          const adjusted = hasAdjustments(material);
          const lastIncrease =
            material.last_adjustment?.direction === "increase";
          const lastDecrease =
            material.last_adjustment?.direction === "decrease";

          return (
            <article
              key={material.id}
              className={cn(
                "rounded-lg border bg-white p-3",
                lastIncrease
                  ? "border-emerald-200 bg-emerald-50/40"
                  : lastDecrease
                    ? "border-rose-200 bg-rose-50/40"
                    : "border-stone-200",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/materials/${material.id}`}
                    className="text-sm font-semibold text-stone-900 hover:text-amber-700"
                  >
                    {material.name}
                  </Link>
                  {material.last_adjustment ? (
                    <p
                      className={cn(
                        "mt-0.5 text-[11px] font-medium",
                        material.last_adjustment.direction === "increase"
                          ? "text-emerald-800"
                          : "text-rose-800",
                      )}
                    >
                      Stock{" "}
                      {material.last_adjustment.direction === "increase"
                        ? "increased"
                        : "decreased"}{" "}
                      by{" "}
                      {formatQuantityWithUnit(
                        material.last_adjustment.quantity,
                        material.unit,
                      )}
                    </p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <MaterialCategoryBadge category={material.category} />
                    <StockStatusBadge status={material.stock_status} />
                  </div>
                </div>
                <MaterialActions
                  materialId={material.id}
                  materialName={material.name}
                  status={material.status}
                  compact
                />
              </div>
              <dl className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-stone-500">Vendor</dt>
                  <dd className="mt-0.5 truncate font-medium text-stone-800">
                    {material.vendor_name || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">Unit</dt>
                  <dd className="mt-0.5 font-medium text-stone-800">
                    {MATERIAL_UNIT_SHORT_LABELS[material.unit]}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">Price / unit</dt>
                  <dd className="mt-0.5 font-medium tabular-nums text-stone-800">
                    {material.default_unit_price != null &&
                    material.default_unit_price !== ""
                      ? formatMaterialCost(material.default_unit_price)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">On hand</dt>
                  <dd className="mt-0.5 font-medium tabular-nums text-stone-800">
                    {formatQuantityWithUnit(
                      material.current_stock,
                      material.unit,
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">Adjusted</dt>
                  <dd
                    className={cn(
                      "mt-0.5 font-medium tabular-nums",
                      adjusted ? "text-stone-800" : "text-stone-400",
                    )}
                  >
                    {formatAdjustedCell(material)}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">Min stock</dt>
                  <dd className="mt-0.5 font-medium tabular-nums text-stone-800">
                    {material.minimum_stock != null &&
                    material.minimum_stock !== ""
                      ? formatQuantityWithUnit(
                          material.minimum_stock,
                          material.unit,
                        )
                      : "—"}
                  </dd>
                </div>
              </dl>
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
