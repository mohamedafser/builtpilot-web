"use client";

import {
  BOQ_ITEM_TYPE_LABELS,
  BOQ_ITEM_TYPES,
  BOQ_UNIT_LABELS,
  BOQ_UNITS,
  defaultUnitForBoqItemType,
  mapMaterialUnitToBoqUnit,
} from "@/constants/boq";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useApiData } from "@/hooks/use-api-data";
import { calculateEstimatedAmount } from "@/lib/boq/calculations";
import { formatLabourCost } from "@/lib/labour/money";
import {
  createBoqItemFormSchema,
  type CreateBoqItemFormInput,
} from "@/lib/validations/boq";
import type { BoqSection, Material } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";

export function BoqItemForm({
  sections,
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
  isEdit = false,
}: {
  sections: Array<Pick<BoqSection, "id" | "name">>;
  defaultValues?: Partial<CreateBoqItemFormInput>;
  submitLabel: string;
  onSubmit: (values: CreateBoqItemFormInput) => Promise<void> | void;
  onCancel?: () => void;
  isEdit?: boolean;
}) {
  const { data } = useApiData<{ materials: Material[] }>(
    "/api/materials/active",
  );
  const materials = useMemo(() => data?.materials ?? [], [data?.materials]);
  const submitLockRef = useRef(false);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CreateBoqItemFormInput>({
    resolver: zodResolver(createBoqItemFormSchema),
    defaultValues: {
      section_id: "",
      item_code: "",
      description: "",
      item_type: "work",
      material_id: "",
      unit: "sq_ft",
      estimated_quantity: "",
      rate: "",
      notes: "",
      ...defaultValues,
    },
  });

  const itemType = useWatch({ control, name: "item_type" });
  const materialId = useWatch({ control, name: "material_id" });
  const quantity = useWatch({ control, name: "estimated_quantity" });
  const rate = useWatch({ control, name: "rate" });
  const estimatedAmount = calculateEstimatedAmount(quantity ?? "", rate ?? "");

  useEffect(() => {
    if (itemType !== "material") {
      setValue("material_id", "");
    }
  }, [itemType, setValue]);

  useEffect(() => {
    if (itemType !== "material" || !materialId) {
      return;
    }

    const material = materials.find((row) => row.id === materialId);

    if (!material) {
      return;
    }

    setValue("description", material.name, { shouldDirty: true });
    setValue("unit", mapMaterialUnitToBoqUnit(material.unit), {
      shouldDirty: true,
    });

    if (material.default_unit_price) {
      setValue("rate", String(material.default_unit_price), {
        shouldDirty: true,
      });
    }
  }, [itemType, materialId, materials, setValue]);

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        if (submitLockRef.current) {
          return;
        }

        submitLockRef.current = true;

        try {
          await onSubmit(values);
        } finally {
          submitLockRef.current = false;
        }
      })}
      className="space-y-4"
    >
      {sections.length > 0 ? (
        <div>
          <Label htmlFor="section_id">Section</Label>
          <Select
            id="section_id"
            className="h-12 text-base sm:h-10 sm:text-sm"
            {...register("section_id")}
          >
            <option value="">Unsectioned</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="item_code">Item code</Label>
          <Input
            id="item_code"
            className="h-12 text-base sm:h-10 sm:text-sm"
            {...register("item_code")}
          />
        </div>
        <div>
          <Label htmlFor="item_type">Item type</Label>
          <Select
            id="item_type"
            className="h-12 text-base sm:h-10 sm:text-sm"
            error={Boolean(errors.item_type)}
            {...register("item_type", {
              onChange: (event) => {
                setValue(
                  "unit",
                  defaultUnitForBoqItemType(
                    event.target.value as CreateBoqItemFormInput["item_type"],
                  ),
                  { shouldDirty: true },
                );
              },
            })}
          >
            {BOQ_ITEM_TYPES.map((type) => (
              <option key={type} value={type}>
                {BOQ_ITEM_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {itemType === "material" ? (
        <div>
          <Label htmlFor="material_id">Catalog material</Label>
          <Select
            id="material_id"
            className="h-12 text-base sm:h-10 sm:text-sm"
            error={Boolean(errors.material_id)}
            {...register("material_id")}
          >
            <option value="">None</option>
            {materials.map((material) => (
              <option key={material.id} value={material.id}>
                {material.name}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-stone-500">
            Description, unit, and rate are copied now and then stored
            independently.
          </p>
        </div>
      ) : null}
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          className="h-12 text-base sm:h-10 sm:text-sm"
          error={Boolean(errors.description)}
          {...register("description")}
        />
        {errors.description ? (
          <p className="mt-1 text-sm text-red-600">
            {errors.description.message}
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="unit">Unit</Label>
          <Select
            id="unit"
            className="h-12 text-base sm:h-10 sm:text-sm"
            error={Boolean(errors.unit)}
            {...register("unit")}
          >
            {BOQ_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {BOQ_UNIT_LABELS[unit]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="estimated_quantity">Estimated quantity</Label>
          <Input
            id="estimated_quantity"
            inputMode="decimal"
            className="h-12 text-base sm:h-10 sm:text-sm"
            error={Boolean(errors.estimated_quantity)}
            {...register("estimated_quantity")}
          />
          {errors.estimated_quantity ? (
            <p className="mt-1 text-sm text-red-600">
              {errors.estimated_quantity.message}
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="rate">Rate</Label>
          <Input
            id="rate"
            inputMode="decimal"
            className="h-12 text-base sm:h-10 sm:text-sm"
            error={Boolean(errors.rate)}
            {...register("rate")}
          />
          {errors.rate ? (
            <p className="mt-1 text-sm text-red-600">{errors.rate.message}</p>
          ) : null}
        </div>
      </div>
      <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
        <p className="text-sm text-stone-500">Estimated amount</p>
        <p className="mt-1 text-lg font-semibold text-stone-900">
          {estimatedAmount ? formatLabourCost(estimatedAmount) : "—"}
        </p>
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...register("notes")} />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} icon={X}>
            Cancel
          </Button>
        ) : null}
        <Button
          type="submit"
          className="h-12 sm:h-10"
          disabled={isSubmitting || (isEdit && !isDirty)}
          icon={Save}
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
