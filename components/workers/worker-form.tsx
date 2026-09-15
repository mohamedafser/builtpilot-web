"use client";

import {
  WORKER_ROLE_LABELS,
  WORKER_ROLES,
  WORKER_STATUS_LABELS,
  WORKER_STATUSES,
  workerToFormValues,
} from "@/constants/worker";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WithIcon } from "@/components/ui/with-icon";
import { Plus, Save, X } from "lucide-react";
import { requestJson } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import {
  createWorkerSchema,
  updateWorkerSchema,
  type WorkerFormValues,
} from "@/lib/validations/worker";
import type { Worker } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

type WorkerFormProps = {
  worker?: Worker;
};

export function WorkerForm({ worker }: WorkerFormProps) {
  const isEdit = Boolean(worker);
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const schema = isEdit ? updateWorkerSchema : createWorkerSchema;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<WorkerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: worker
      ? workerToFormValues(worker)
      : {
          name: "",
          phone: "",
          role: "mason",
          daily_wage: "",
          notes: "",
          status: "active",
        },
  });

  async function onSubmit(values: WorkerFormValues) {
    setFormError(null);

    const result = worker
      ? await requestJson<{ id: string }>(`/api/workers/${worker.id}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        })
      : await requestJson<{ id: string }>("/api/workers", {
          method: "POST",
          body: JSON.stringify(values),
        });

    if (!result.ok) {
      showToast(result.message, "error");
      setFormError(result.message);
      return;
    }

    showToast(result.message, "success");
    router.push(`/workers/${result.data.id}`);
    router.refresh();
  }

  const cancelHref = worker ? `/workers/${worker.id}` : "/workers";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">
            Name <span className="text-red-600">*</span>
          </Label>
          <Input
            id="name"
            autoComplete="name"
            className="h-12 sm:h-10"
            error={Boolean(errors.name)}
            {...register("name")}
          />
          {errors.name ? (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            className="h-12 sm:h-10"
            error={Boolean(errors.phone)}
            {...register("phone")}
          />
          {errors.phone ? (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="role">
            Role <span className="text-red-600">*</span>
          </Label>
          <Select
            id="role"
            className="h-12 sm:h-10"
            error={Boolean(errors.role)}
            {...register("role")}
          >
            {WORKER_ROLES.map((role) => (
              <option key={role} value={role}>
                {WORKER_ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
          {errors.role ? (
            <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="daily_wage">
            Daily wage (₹) <span className="text-red-600">*</span>
          </Label>
          <Input
            id="daily_wage"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className="h-12 sm:h-10"
            error={Boolean(errors.daily_wage)}
            {...register("daily_wage")}
          />
          {errors.daily_wage ? (
            <p className="mt-1 text-sm text-red-600">
              {errors.daily_wage.message}
            </p>
          ) : null}
          {isEdit ? (
            <p className="mt-1 text-xs text-stone-500">
              Changing wage does not update historical attendance records.
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
              {WORKER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {WORKER_STATUS_LABELS[status]}
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
              : "Create worker"}
        </Button>
      </div>
    </form>
  );
}
