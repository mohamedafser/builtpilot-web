"use client";

import {
  MATERIAL_CATEGORIES,
  MATERIAL_CATEGORY_LABELS,
  MATERIAL_STATUS_LABELS,
  MATERIAL_STATUSES,
  MATERIAL_UNIT_LABELS,
  MATERIAL_UNITS,
  materialToFormValues,
} from "@/constants/material";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requestJson } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import { WithIcon } from "@/components/ui/with-icon";
import { Plus, Save, X } from "lucide-react";
import {
  createMaterialSchema,
  updateMaterialSchema,
  type MaterialFormValues,
} from "@/lib/validations/material";
import type { Material } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

export function MaterialForm({
  material,
}: {
  material?: Material & { vendor_name?: string | null };
}) {
  const isEdit = Boolean(material);
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const schema = isEdit ? updateMaterialSchema : createMaterialSchema;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<MaterialFormValues>({
    resolver: zodResolver(schema),
    defaultValues: material
      ? materialToFormValues(material)
      : {
          name: "",
          category: "cement",
          unit: "bag",
          default_unit_price: "",
          minimum_stock: "",
          notes: "",
          vendor_id: "",
          status: "active",
        },
  });

  useEffect(() => {
    let cancelled = false;

    void requestJson<{ vendors: { id: string; name: string }[] }>(
      "/api/vendors/active",
    ).then((result) => {
      if (cancelled || !result.ok) {
        return;
      }

      const loaded = result.data.vendors.map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
      }));

      if (
        material?.vendor_id &&
        !loaded.some((vendor) => vendor.id === material.vendor_id)
      ) {
        loaded.unshift({
          id: material.vendor_id,
          name: material.vendor_name || "Selected vendor",
        });
      }

      setVendors(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, [material]);

  async function onSubmit(values: MaterialFormValues) {
    setFormError(null);

    const result = material
      ? await requestJson<{ id: string }>(`/api/materials/${material.id}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        })
      : await requestJson<{ id: string }>("/api/materials", {
          method: "POST",
          body: JSON.stringify(values),
        });

    if (!result.ok) {
      showToast(result.message, "error");
      setFormError(result.message);
      return;
    }

    showToast(result.message, "success");
    router.push(`/materials/${result.data.id}`);
    router.refresh();
  }

  const cancelHref = material ? `/materials/${material.id}` : "/materials";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">
            Material name <span className="text-red-600">*</span>
          </Label>
          <Input
            id="name"
            className="h-12 sm:h-10"
            error={Boolean(errors.name)}
            {...register("name")}
          />
          {errors.name ? (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="category">
            Category <span className="text-red-600">*</span>
          </Label>
          <Select
            id="category"
            className="h-12 sm:h-10"
            error={Boolean(errors.category)}
            {...register("category")}
          >
            {MATERIAL_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {MATERIAL_CATEGORY_LABELS[category]}
              </option>
            ))}
          </Select>
          {errors.category ? (
            <p className="mt-1 text-sm text-red-600">
              {errors.category.message}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="unit">
            Unit <span className="text-red-600">*</span>
          </Label>
          <Select
            id="unit"
            className="h-12 sm:h-10"
            error={Boolean(errors.unit)}
            {...register("unit")}
          >
            {MATERIAL_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {MATERIAL_UNIT_LABELS[unit]}
              </option>
            ))}
          </Select>
          {errors.unit ? (
            <p className="mt-1 text-sm text-red-600">{errors.unit.message}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="default_unit_price">Default unit price (₹)</Label>
          <Input
            id="default_unit_price"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className="h-12 sm:h-10"
            error={Boolean(errors.default_unit_price)}
            {...register("default_unit_price")}
          />
          {errors.default_unit_price ? (
            <p className="mt-1 text-sm text-red-600">
              {errors.default_unit_price.message}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="minimum_stock">Minimum stock</Label>
          <Input
            id="minimum_stock"
            type="number"
            min="0"
            step="0.001"
            inputMode="decimal"
            className="h-12 sm:h-10"
            error={Boolean(errors.minimum_stock)}
            {...register("minimum_stock")}
          />
          {errors.minimum_stock ? (
            <p className="mt-1 text-sm text-red-600">
              {errors.minimum_stock.message}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="vendor_id">Vendor</Label>
          <Select
            id="vendor_id"
            className="h-12 sm:h-10"
            error={Boolean(errors.vendor_id)}
            {...register("vendor_id")}
          >
            <option value="">No vendor</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name}
              </option>
            ))}
          </Select>
          {errors.vendor_id ? (
            <p className="mt-1 text-sm text-red-600">
              {errors.vendor_id.message}
            </p>
          ) : null}
        </div>

        {isEdit ? (
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              className="h-12 sm:h-10"
              error={Boolean(errors.status)}
              {...register("status")}
            >
              {MATERIAL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {MATERIAL_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
            {errors.status ? (
              <p className="mt-1 text-sm text-red-600">
                {errors.status.message}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            rows={4}
            error={Boolean(errors.notes)}
            {...register("notes")}
          />
          {errors.notes ? (
            <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href={cancelHref}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 hover:bg-stone-50 sm:h-10"
        >
          <WithIcon icon={X}>Cancel</WithIcon>
        </Link>
        <Button
          type="submit"
          disabled={isSubmitting || (isEdit && !isDirty)}
          className="h-12 sm:h-10"
          icon={isEdit ? Save : Plus}
        >
          {isSubmitting
            ? "Saving..."
            : isEdit
              ? "Save changes"
              : "Create material"}
        </Button>
      </div>
    </form>
  );
}
