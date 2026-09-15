"use client";

import { MaterialActions } from "@/components/materials/material-actions";
import {
  MaterialCategoryBadge,
  StockStatusBadge,
} from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { MATERIAL_UNIT_SHORT_LABELS } from "@/constants/material";
import type { PaginationMeta } from "@/lib/api/pagination";
import { requestJson } from "@/lib/api/client";
import {
  formatQuantityWithUnit,
  parseQuantityToMilli,
  resolveStockStatus,
} from "@/lib/materials/stock";
import type { MaterialListItem } from "@/lib/materials/types";
import { showToast } from "@/lib/toast";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

type VendorOption = { id: string; name: string };

function priceDisplayValue(value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  return String(value);
}

function stockDisplayValue(value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  return String(value);
}

function useMaterialInlineEdit(
  material: MaterialListItem,
  vendors: VendorOption[],
  onUpdated: (next: MaterialListItem) => void,
) {
  const [price, setPrice] = useState(priceDisplayValue(material.default_unit_price));
  const [minStock, setMinStock] = useState(
    stockDisplayValue(material.minimum_stock),
  );
  const [vendorId, setVendorId] = useState(material.vendor_id ?? "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPrice(priceDisplayValue(material.default_unit_price));
    setMinStock(stockDisplayValue(material.minimum_stock));
    setVendorId(material.vendor_id ?? "");
  }, [
    material.id,
    material.default_unit_price,
    material.minimum_stock,
    material.vendor_id,
  ]);

  function savePatch(patch: {
    default_unit_price?: string;
    minimum_stock?: string;
    vendor_id?: string;
  }) {
    startTransition(async () => {
      const result = await requestJson<{ id: string }>(
        `/api/materials/${material.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(patch),
        },
      );

      if (!result.ok) {
        showToast(result.message, "error");
        setPrice(priceDisplayValue(material.default_unit_price));
        setMinStock(stockDisplayValue(material.minimum_stock));
        setVendorId(material.vendor_id ?? "");
        return;
      }

      const nextPrice =
        patch.default_unit_price !== undefined
          ? patch.default_unit_price || null
          : material.default_unit_price;
      const nextMin =
        patch.minimum_stock !== undefined
          ? patch.minimum_stock || null
          : material.minimum_stock;
      const nextVendorId =
        patch.vendor_id !== undefined
          ? patch.vendor_id || null
          : material.vendor_id;
      const nextVendorName =
        nextVendorId == null
          ? null
          : (vendors.find((vendor) => vendor.id === nextVendorId)?.name ??
            material.vendor_name);
      const currentMilli = parseQuantityToMilli(material.current_stock) ?? 0;
      const minMilli =
        nextMin == null || nextMin === ""
          ? null
          : (parseQuantityToMilli(nextMin) ?? null);

      onUpdated({
        ...material,
        default_unit_price: nextPrice,
        minimum_stock: nextMin,
        vendor_id: nextVendorId,
        vendor_name: nextVendorName,
        stock_status: resolveStockStatus(currentMilli, minMilli),
      });
      showToast("Material updated.", "success");
    });
  }

  const vendorOptions = vendors.slice();
  if (
    material.vendor_id &&
    material.vendor_name &&
    !vendorOptions.some((vendor) => vendor.id === material.vendor_id)
  ) {
    vendorOptions.unshift({
      id: material.vendor_id,
      name: material.vendor_name,
    });
  }

  return {
    price,
    setPrice,
    minStock,
    setMinStock,
    vendorId,
    setVendorId,
    isPending,
    savePatch,
    vendorOptions,
  };
}

function MaterialInlineRow({
  material,
  vendors,
  onUpdated,
}: {
  material: MaterialListItem;
  vendors: VendorOption[];
  onUpdated: (next: MaterialListItem) => void;
}) {
  const edit = useMaterialInlineEdit(material, vendors, onUpdated);

  return (
    <tr className={`border-t border-stone-100 ${edit.isPending ? "opacity-60" : ""}`}>
      <td className="px-3 py-2">
        <Link
          href={`/materials/${material.id}`}
          className="text-sm font-medium text-stone-900 hover:text-amber-700"
        >
          {material.name}
        </Link>
        <div className="mt-0.5">
          <MaterialCategoryBadge category={material.category} />
        </div>
      </td>
      <td className="px-3 py-2">
        <Select
          className="h-8 min-w-[8rem] text-xs"
          value={edit.vendorId}
          disabled={edit.isPending}
          aria-label={`Vendor for ${material.name}`}
          onChange={(event) => {
            const next = event.target.value;
            edit.setVendorId(next);
            if (next !== (material.vendor_id ?? "")) {
              edit.savePatch({ vendor_id: next });
            }
          }}
        >
          <option value="">No vendor</option>
          {edit.vendorOptions.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.name}
            </option>
          ))}
        </Select>
      </td>
      <td className="px-3 py-2 text-xs text-stone-600">
        {MATERIAL_UNIT_SHORT_LABELS[material.unit]}
      </td>
      <td className="px-3 py-2">
        <Input
          className="h-8 w-24 text-xs"
          inputMode="decimal"
          value={edit.price}
          disabled={edit.isPending}
          aria-label={`Price for ${material.name}`}
          onChange={(event) => edit.setPrice(event.target.value)}
          onBlur={() => {
            const next = edit.price.trim();
            if (next !== priceDisplayValue(material.default_unit_price)) {
              edit.savePatch({ default_unit_price: next });
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-col gap-1">
          <Input
            className="h-8 w-20 text-xs"
            inputMode="decimal"
            value={edit.minStock}
            disabled={edit.isPending}
            aria-label={`Min stock for ${material.name}`}
            title="Minimum stock"
            onChange={(event) => edit.setMinStock(event.target.value)}
            onBlur={() => {
              const next = edit.minStock.trim();
              if (next !== stockDisplayValue(material.minimum_stock)) {
                edit.savePatch({ minimum_stock: next });
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
          <span className="text-[11px] tabular-nums text-stone-500">
            On hand{" "}
            {formatQuantityWithUnit(material.current_stock, material.unit)}
          </span>
        </div>
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
}

function MaterialInlineCard({
  material,
  vendors,
  onUpdated,
}: {
  material: MaterialListItem;
  vendors: VendorOption[];
  onUpdated: (next: MaterialListItem) => void;
}) {
  const edit = useMaterialInlineEdit(material, vendors, onUpdated);

  return (
    <article
      className={`rounded-lg border border-stone-200 bg-white p-3 ${edit.isPending ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/materials/${material.id}`}
            className="text-sm font-semibold text-stone-900 hover:text-amber-700"
          >
            {material.name}
          </Link>
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

      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <label className="mb-0.5 block text-[10px] font-medium text-stone-500">
            Vendor
          </label>
          <Select
            className="h-8 text-xs"
            value={edit.vendorId}
            disabled={edit.isPending}
            onChange={(event) => {
              const next = event.target.value;
              edit.setVendorId(next);
              if (next !== (material.vendor_id ?? "")) {
                edit.savePatch({ vendor_id: next });
              }
            }}
          >
            <option value="">No vendor</option>
            {edit.vendorOptions.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-medium text-stone-500">
            Price / unit
          </label>
          <Input
            className="h-8 text-xs"
            inputMode="decimal"
            value={edit.price}
            disabled={edit.isPending}
            onChange={(event) => edit.setPrice(event.target.value)}
            onBlur={() => {
              const next = edit.price.trim();
              if (next !== priceDisplayValue(material.default_unit_price)) {
                edit.savePatch({ default_unit_price: next });
              }
            }}
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-medium text-stone-500">
            Min stock
          </label>
          <Input
            className="h-8 text-xs"
            inputMode="decimal"
            value={edit.minStock}
            disabled={edit.isPending}
            onChange={(event) => edit.setMinStock(event.target.value)}
            onBlur={() => {
              const next = edit.minStock.trim();
              if (next !== stockDisplayValue(material.minimum_stock)) {
                edit.savePatch({ minimum_stock: next });
              }
            }}
          />
        </div>
        <div>
          <label className="mb-0.5 block text-[10px] font-medium text-stone-500">
            On hand
          </label>
          <p className="flex h-8 items-center text-xs font-medium tabular-nums text-stone-800">
            {formatQuantityWithUnit(material.current_stock, material.unit)}
          </p>
        </div>
      </div>
    </article>
  );
}

export function MaterialList({
  materials: initialMaterials,
  pagination,
  vendors,
}: {
  materials: MaterialListItem[];
  pagination: PaginationMeta;
  vendors: VendorOption[];
}) {
  const [materials, setMaterials] = useState(initialMaterials);

  useEffect(() => {
    setMaterials(initialMaterials);
  }, [initialMaterials]);

  function onUpdated(next: MaterialListItem) {
    setMaterials((current) =>
      current.map((row) => (row.id === next.id ? next : row)),
    );
  }

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
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-3 py-2 font-medium">Material</th>
                <th className="px-3 py-2 font-medium">Vendor</th>
                <th className="px-3 py-2 font-medium">Unit</th>
                <th className="px-3 py-2 font-medium">Price / unit</th>
                <th className="px-3 py-2 font-medium">Stock</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {materials.map((material) => (
                <MaterialInlineRow
                  key={material.id}
                  material={material}
                  vendors={vendors}
                  onUpdated={onUpdated}
                />
              ))}
            </tbody>
          </table>
        </div>
        {pager}
      </div>

      <div className="space-y-2 md:hidden">
        {materials.map((material) => (
          <MaterialInlineCard
            key={material.id}
            material={material}
            vendors={vendors}
            onUpdated={onUpdated}
          />
        ))}
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          {pager}
        </div>
      </div>
    </>
  );
}
