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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5">
      <p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
        Remaining: {remaining} {BOQ_UNIT_SHORT_LABELS[item.unit]}
      </p>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="measurement_date" className="text-xs">
            Date
          </Label>
          <Input
            id="measurement_date"
            type="date"
            className="mt-1 h-9 text-sm"
            error={Boolean(errors.measurement_date)}
            {...register("measurement_date")}
          />
        </div>
        <div>
          <Label htmlFor="quantity" className="text-xs">
            Quantity ({BOQ_UNIT_SHORT_LABELS[item.unit]})
          </Label>
          <Input
            id="quantity"
            inputMode="decimal"
            className="mt-1 h-9 text-sm"
            error={Boolean(errors.quantity)}
            {...register("quantity")}
          />
          {errors.quantity ? (
            <p className="mt-1 text-xs text-red-600">
              {errors.quantity.message}
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="location" className="text-xs">
            Location
          </Label>
          <Input
            id="location"
            placeholder="Ground Floor - East Wall"
            className="mt-1 h-9 text-sm"
            {...register("location")}
          />
        </div>
        <div>
          <Label htmlFor="reference" className="text-xs">
            Reference
          </Label>
          <Input
            id="reference"
            className="mt-1 h-9 text-sm"
            {...register("reference")}
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label htmlFor="description" className="text-xs">
            Description
          </Label>
          <Input
            id="description"
            placeholder="Completed brickwork"
            className="mt-1 h-9 text-sm"
            {...register("description")}
          />
        </div>
        <div>
          <Label htmlFor="notes" className="text-xs">
            Notes
          </Label>
          <Textarea
            id="notes"
            rows={2}
            className="mt-1 min-h-0 resize-y text-sm"
            {...register("notes")}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          className="h-9"
          disabled={isSubmitting}
          icon={Save}
        >
          {isSubmitting ? "Saving..." : "Save measurement"}
        </Button>
      </div>
    </form>
  );
}
