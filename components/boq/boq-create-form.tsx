"use client";

import { Button, linkButtonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WithIcon } from "@/components/ui/with-icon";
import { useApiData } from "@/hooks/use-api-data";
import { requestJson } from "@/lib/api/client";
import { BOQ_TEMPLATE_LIBRARY } from "@/constants/boq";
import { formatLabourCost } from "@/lib/labour/money";
import { createBoqFormSchema } from "@/lib/validations/boq";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { z } from "zod";

type FormValues = z.infer<typeof createBoqFormSchema>;

type QuotationOption = {
  id: string;
  quotation_number: string;
  title: string;
  total_amount: string;
};

export function BoqCreateForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { data } = useApiData<{ quotations: QuotationOption[] }>(
    `/api/projects/${projectId}/boq/quotations`,
  );
  const quotations = data?.quotations ?? [];
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(createBoqFormSchema),
    defaultValues: {
      name: "",
      description: "",
      quotation_id: "",
      template_id: "",
    },
  });

  async function onSubmit(values: FormValues) {
    const result = await requestJson<{ id: string }>(
      `/api/projects/${projectId}/boq`,
      {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          quotation_id: values.quotation_id || undefined,
          template_id: values.template_id || undefined,
        }),
      },
    );

    if (!result.ok) {
      return;
    }

    router.push(`/projects/${projectId}/boq/${result.data.id}/edit`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <Label htmlFor="name">BOQ name</Label>
        <Input
          id="name"
          className="h-12 text-base sm:h-10 sm:text-sm"
          error={Boolean(errors.name)}
          {...register("name")}
        />
        {errors.name ? (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        ) : null}
      </div>
      <div>
        <Label htmlFor="description">Description / notes</Label>
        <Textarea id="description" {...register("description")} />
      </div>
      <div>
        <Label htmlFor="template_id">Estimate starting point</Label>
        <Select
          id="template_id"
          className="h-12 text-base sm:h-10 sm:text-sm"
          {...register("template_id")}
        >
          <option value="">Create from scratch</option>
          {BOQ_TEMPLATE_LIBRARY.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-xs text-stone-500">
          Choose a reusable BOQ template or begin with a blank estimate.
        </p>
      </div>
      {quotations.length > 0 ? (
        <div>
          <Label htmlFor="quotation_id">Reference quotation</Label>
          <Select
            id="quotation_id"
            className="h-12 text-base sm:h-10 sm:text-sm"
            {...register("quotation_id")}
          >
            <option value="">Start from scratch</option>
            {quotations.map((quotation) => (
              <option key={quotation.id} value={quotation.id}>
                {quotation.quotation_number} · {quotation.title} ·{" "}
                {formatLabourCost(quotation.total_amount)}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-stone-500">
            Use a quotation as a baseline estimate only. Changes to the
            quotation will not update this BOQ automatically.
          </p>
        </div>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link
          href={`/projects/${projectId}/boq`}
          className={cn(linkButtonClassName("secondary"), "h-12 sm:h-10")}
        >
          <WithIcon icon={X}>Cancel</WithIcon>
        </Link>
        <Button
          type="submit"
          className="h-12 sm:h-10"
          disabled={isSubmitting}
          icon={Plus}
        >
          {isSubmitting ? "Creating..." : "Create BOQ"}
        </Button>
      </div>
    </form>
  );
}
