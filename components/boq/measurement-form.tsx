"use client";

import { BOQ_UNIT_SHORT_LABELS } from "@/constants/boq";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requestJson } from "@/lib/api/client";
import { remainingQuantity } from "@/lib/boq/calculations";
import { todayIsoDate } from "@/lib/labour/money";
import {
  createMeasurementFormSchema,
  type CreateMeasurementFormInput,
} from "@/lib/validations/boq";
import type { BoqItemProgress } from "@/lib/boq/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

export function MeasurementForm({
  projectId,
  boqId,
  item,
  onSaved,
}: {
  projectId: string;
  boqId: string;
  item: BoqItemProgress;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const remaining = remainingQuantity(
    item.estimated_quantity,
    item.completed_quantity,
  );
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateMeasurementFormInput>({
    resolver: zodResolver(createMeasurementFormSchema),
    defaultValues: {
      measurement_date: todayIsoDate(),
      quantity: "",
      unit: item.unit,
      location: "",
      description: "",
      reference: "",
      notes: "",
    },
  });

  async function onSubmit(values: CreateMeasurementFormInput) {
    const result = await requestJson<{ id: string }>(
      `/api/projects/${projectId}/boq/${boqId}/items/${item.id}/measurements`,
      {
        method: "POST",
        body: JSON.stringify({
          ...values,
          unit: item.unit,
        }),
      },
    );

    if (!result.ok) {
      return;
    }

    reset({
      measurement_date: todayIsoDate(),
      quantity: "",
      unit: item.unit,
      location: "",
      description: "",
      reference: "",
      notes: "",
    });
    onSaved?.();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Remaining quantity: {remaining} {BOQ_UNIT_SHORT_LABELS[item.unit]}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="measurement_date">Measurement date</Label>
          <Input
            id="measurement_date"
            type="date"
            className="h-12 text-base sm:h-10 sm:text-sm"
            error={Boolean(errors.measurement_date)}
            {...register("measurement_date")}
          />
        </div>
        <div>
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            inputMode="decimal"
            className="h-14 text-xl sm:h-12 sm:text-lg"
            error={Boolean(errors.quantity)}
            {...register("quantity")}
          />
          <p className="mt-1 text-xs text-stone-500">
            Unit: {BOQ_UNIT_SHORT_LABELS[item.unit]}
          </p>
          {errors.quantity ? (
            <p className="mt-1 text-sm text-red-600">
              {errors.quantity.message}
            </p>
          ) : null}
        </div>
      </div>
      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          placeholder="Ground Floor - East Wall"
          className="h-12 text-base sm:h-10 sm:text-sm"
          {...register("location")}
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="Completed brickwork"
          className="h-12 text-base sm:h-10 sm:text-sm"
          {...register("description")}
        />
      </div>
      <div>
        <Label htmlFor="reference">Reference</Label>
        <Input
          id="reference"
          className="h-12 text-base sm:h-10 sm:text-sm"
          {...register("reference")}
        />
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" {...register("notes")} />
      </div>
      <Button
        type="submit"
        fullWidth
        className="h-14 text-base"
        disabled={isSubmitting}
        icon={Save}
      >
        {isSubmitting ? "Saving..." : "Save measurement"}
      </Button>
    </form>
  );
}
