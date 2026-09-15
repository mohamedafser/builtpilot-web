"use client";

import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
  projectToFormValues,
} from "@/constants/project";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WithIcon } from "@/components/ui/with-icon";
import { requestJson } from "@/lib/api/client";
import { useLocale } from "@/lib/i18n/locale-context";
import { showToast } from "@/lib/toast";
import {
  createProjectSchema,
  type CreateProjectFormValues,
} from "@/lib/validations/project";
import type { Project } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Save, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

type ProjectFormProps = {
  project?: Project;
};

function RequiredMark() {
  return <span className="text-red-600">*</span>;
}

export function ProjectForm({ project }: ProjectFormProps) {
  const isEdit = Boolean(project);
  const router = useRouter();
  const { currencyCode } = useLocale();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: project
      ? projectToFormValues(project)
      : {
          name: "",
          client_name: "",
          client_phone: "",
          client_email: "",
          location: "",
          description: "",
          estimated_budget: "",
          status: "planning",
          start_date: "",
          expected_end_date: "",
        },
  });

  async function onSubmit(values: CreateProjectFormValues) {
    setFormError(null);

    const result = project
      ? await requestJson<{ id: string }>(`/api/projects/${project.id}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        })
      : await requestJson<{ id: string }>("/api/projects", {
          method: "POST",
          body: JSON.stringify(values),
        });

    if (!result.ok) {
      showToast(result.message, "error");
      setFormError(result.message);
      return;
    }

    showToast(result.message, "success");
    router.push(`/projects/${result.data.id}`);
    router.refresh();
  }

  const cancelHref = project ? `/projects/${project.id}` : "/projects";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">
            Project name <RequiredMark />
          </Label>
          <Input
            id="name"
            autoComplete="off"
            error={Boolean(errors.name)}
            {...register("name")}
          />
          {errors.name ? (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="client_name">
            Client name <RequiredMark />
          </Label>
          <Input
            id="client_name"
            autoComplete="organization"
            error={Boolean(errors.client_name)}
            {...register("client_name")}
          />
          {errors.client_name ? (
            <p className="mt-1 text-sm text-red-600">
              {errors.client_name.message}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="client_phone">
            Client phone <RequiredMark />
          </Label>
          <Input
            id="client_phone"
            type="tel"
            autoComplete="tel"
            error={Boolean(errors.client_phone)}
            {...register("client_phone")}
          />
          {errors.client_phone ? (
            <p className="mt-1 text-sm text-red-600">
              {errors.client_phone.message}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="client_email">
            Client email <RequiredMark />
          </Label>
          <Input
            id="client_email"
            type="email"
            autoComplete="email"
            error={Boolean(errors.client_email)}
            {...register("client_email")}
          />
          {errors.client_email ? (
            <p className="mt-1 text-sm text-red-600">
              {errors.client_email.message}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="location">
            Location <RequiredMark />
          </Label>
          <Input
            id="location"
            error={Boolean(errors.location)}
            {...register("location")}
          />
          {errors.location ? (
            <p className="mt-1 text-sm text-red-600">
              {errors.location.message}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="estimated_budget">
            Estimated budget ({currencyCode}) <RequiredMark />
          </Label>
          <Input
            id="estimated_budget"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            error={Boolean(errors.estimated_budget)}
            {...register("estimated_budget")}
          />
          {errors.estimated_budget ? (
            <p className="mt-1 text-sm text-red-600">
              {errors.estimated_budget.message}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="status">
            Status <RequiredMark />
          </Label>
          <Select
            id="status"
            error={Boolean(errors.status)}
            {...register("status")}
          >
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PROJECT_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
          {errors.status ? (
            <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="start_date">
            Start date <RequiredMark />
          </Label>
          <Input
            id="start_date"
            type="date"
            error={Boolean(errors.start_date)}
            {...register("start_date")}
          />
          {errors.start_date ? (
            <p className="mt-1 text-sm text-red-600">
              {errors.start_date.message}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="expected_end_date">
            Expected end date <RequiredMark />
          </Label>
          <Input
            id="expected_end_date"
            type="date"
            error={Boolean(errors.expected_end_date)}
            {...register("expected_end_date")}
          />
          {errors.expected_end_date ? (
            <p className="mt-1 text-sm text-red-600">
              {errors.expected_end_date.message}
            </p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="description">
            Description <RequiredMark />
          </Label>
          <Textarea
            id="description"
            rows={4}
            error={Boolean(errors.description)}
            {...register("description")}
          />
          {errors.description ? (
            <p className="mt-1 text-sm text-red-600">
              {errors.description.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href={cancelHref}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 hover:bg-stone-50 sm:h-10"
        >
          <WithIcon icon={X}>Cancel</WithIcon>
        </Link>
        <Button
          type="submit"
          disabled={isSubmitting || (isEdit && !isDirty)}
          className="h-11 sm:h-10"
          icon={isEdit ? Save : Plus}
        >
          {isSubmitting
            ? "Saving..."
            : isEdit
              ? "Save changes"
              : "Create project"}
        </Button>
      </div>
    </form>
  );
}
