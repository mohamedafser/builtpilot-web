"use client";

import {
  DEFAULT_QUOTATION_VALIDITY_DAYS,
  DISCOUNT_TYPE_LABELS,
  DISCOUNT_TYPES,
  QUOTATION_ITEM_TYPE_LABELS,
  QUOTATION_ITEM_TYPES,
  QUOTATION_UNIT_LABELS,
  QUOTATION_UNITS,
  defaultUnitForItemType,
  quotationToFormValues,
} from "@/constants/quotation";
import { WORKER_ROLE_LABELS } from "@/constants/worker";
import { CompactPanel } from "@/components/projects/project-section-chrome";
import { Alert } from "@/components/ui/alert";
import { Button, linkButtonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WithIcon } from "@/components/ui/with-icon";
import { requestJson } from "@/lib/api/client";
import {
  addDaysIso,
  calculateLineTotal,
  calculateQuotationTotals,
} from "@/lib/quotations/calculations";
import { formatLabourCost, todayIsoDate } from "@/lib/labour/money";
import { isDiscountType } from "@/constants/quotation";
import {
  createQuotationFormSchema,
  type QuotationFormValues,
} from "@/lib/validations/quotation";
import type { QuotationDetail } from "@/lib/quotations/types";
import type { Material, Project, Worker } from "@/types";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Plus, Save, Send, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

type WorkerOption = Pick<Worker, "id" | "name" | "role" | "daily_wage">;

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-[11px] font-medium text-stone-500"
    >
      {children}
    </label>
  );
}

function emptyItem(
  itemType: QuotationFormValues["items"][number]["item_type"] = "custom",
) {
  return {
    item_type: itemType,
    material_id: "",
    worker_id: "",
    description: "",
    quantity: "1",
    unit: defaultUnitForItemType(itemType),
    unit_price: "",
    notes: "",
  };
}

function normalizeDecimal(value: string | number | undefined | null): string {
  if (value == null || value === "") return "";
  const asString = String(value).trim();
  if (asString === "") return "";
  const parsed = Number(asString);
  if (!Number.isFinite(parsed)) return asString;
  return String(parsed);
}

/** Stable snapshot for dirty comparison (ignores submit_action). */
function quotationFormSnapshot(values: {
  title?: string;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  client_address?: string;
  quotation_date?: string;
  valid_until?: string;
  project_id?: string;
  discount_type?: string;
  discount_value?: string;
  tax_percentage?: string;
  notes?: string;
  terms?: string;
  items?: Array<{
    item_type?: string;
    material_id?: string;
    worker_id?: string;
    description?: string;
    quantity?: string;
    unit?: string;
    unit_price?: string;
    notes?: string;
  }>;
} | undefined): string {
  if (!values) return "";

  return JSON.stringify({
    title: values.title ?? "",
    client_name: values.client_name ?? "",
    client_phone: values.client_phone ?? "",
    client_email: values.client_email ?? "",
    client_address: values.client_address ?? "",
    quotation_date: values.quotation_date ?? "",
    valid_until: values.valid_until ?? "",
    project_id: values.project_id ?? "",
    discount_type: values.discount_type ?? "",
    discount_value: normalizeDecimal(values.discount_value),
    tax_percentage: normalizeDecimal(values.tax_percentage),
    notes: values.notes ?? "",
    terms: values.terms ?? "",
    items: (values.items ?? []).map((item) => ({
      item_type: item.item_type ?? "custom",
      material_id: item.material_id ?? "",
      worker_id: item.worker_id ?? "",
      description: item.description ?? "",
      quantity: normalizeDecimal(item.quantity),
      unit: item.unit ?? "",
      unit_price: normalizeDecimal(item.unit_price),
      notes: item.notes ?? "",
    })),
  });
}

function workerOptionLabel(worker: WorkerOption) {
  return `${worker.name} (${WORKER_ROLE_LABELS[worker.role]}) · ${formatLabourCost(worker.daily_wage)}/day`;
}

export function QuotationForm({
  quotation,
  lockedProjectId,
  defaultProject,
  initialValues,
}: {
  quotation?: QuotationDetail;
  lockedProjectId?: string;
  defaultProject?: Project;
  initialValues?: QuotationFormValues;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const today = todayIsoDate();
  const defaultFormValues = useMemo<QuotationFormValues>(() => {
    if (quotation) {
      return quotationToFormValues(quotation, quotation.items);
    }

    if (initialValues) {
      return {
        ...initialValues,
        project_id: lockedProjectId || initialValues.project_id || "",
        submit_action: initialValues.submit_action ?? "draft",
      };
    }

    return {
      title: defaultProject?.name ?? "",
      client_name: defaultProject?.client_name ?? "",
      client_phone: defaultProject?.client_phone ?? "",
      client_email: defaultProject?.client_email ?? "",
      client_address: defaultProject?.location ?? "",
      quotation_date: today,
      valid_until: addDaysIso(today, DEFAULT_QUOTATION_VALIDITY_DAYS),
      project_id: lockedProjectId ?? "",
      discount_type: "",
      discount_value: "",
      tax_percentage: "",
      notes: "",
      terms: "",
      submit_action: "draft",
      items: [emptyItem("custom")],
    };
  }, [defaultProject, initialValues, lockedProjectId, quotation, today]);

  const baselineSnapshot = useMemo(
    () => quotationFormSnapshot(defaultFormValues),
    [defaultFormValues],
  );

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QuotationFormValues>({
    resolver: zodResolver(createQuotationFormSchema),
    shouldUnregister: false,
    defaultValues: defaultFormValues,
  });
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "items",
  });
  const watchedValues = useWatch({ control });
  const watchedItems = watchedValues.items;
  const discountType = watchedValues.discount_type;
  const discountValue = watchedValues.discount_value;
  const taxPercentage = watchedValues.tax_percentage;
  const createPath = lockedProjectId
    ? `/api/projects/${lockedProjectId}/quotations`
    : "/api/quotations";
  const cancelHref = quotation
    ? `/quotations/${quotation.id}`
    : lockedProjectId
      ? `/projects/${lockedProjectId}/quotations`
      : "/quotations";

  useEffect(() => {
    let cancelled = false;

    void requestJson<{ materials: Material[] }>("/api/materials/active").then(
      (result) => {
        if (cancelled || !result.ok) {
          return;
        }

        setMaterials(result.data.materials);
      },
    );

    void requestJson<{ workers: Worker[] }>("/api/workers/active").then(
      (result) => {
        if (cancelled || !result.ok) {
          return;
        }

        const loaded: WorkerOption[] = result.data.workers.map((worker) => ({
          id: worker.id,
          name: worker.name,
          role: worker.role,
          daily_wage: worker.daily_wage,
        }));

        for (const item of quotation?.items ?? []) {
          if (
            item.item_type !== "labour" ||
            !item.worker_id ||
            loaded.some((worker) => worker.id === item.worker_id)
          ) {
            continue;
          }

          loaded.push({
            id: item.worker_id,
            name: item.description || "Selected worker",
            role: "other",
            daily_wage: String(item.unit_price),
          });
        }

        setWorkers(loaded);
      },
    );

    if (!lockedProjectId) {
      void requestJson<{ projects: { id: string; name: string }[] }>(
        "/api/projects?page_size=50",
      ).then((result) => {
        if (cancelled || !result.ok) {
          return;
        }

        setProjects(
          result.data.projects.map((project) => ({
            id: project.id,
            name: project.name,
          })),
        );
      });
    }

    return () => {
      cancelled = true;
    };
  }, [lockedProjectId, quotation?.items]);

  const previewTotals = useMemo(() => {
    const calculated = (watchedItems ?? []).map((item) => ({
      total_amount:
        calculateLineTotal(item.quantity || "0", item.unit_price || "0") ??
        "0.00",
    }));

    return calculateQuotationTotals({
      items: calculated,
      discount_type:
        discountType && isDiscountType(discountType) ? discountType : null,
      discount_value: discountValue,
      tax_percentage: taxPercentage,
    });
  }, [discountType, discountValue, taxPercentage, watchedItems]);

  function onMaterialChange(index: number, materialId: string) {
    const material = materials.find((item) => item.id === materialId);
    setValue(`items.${index}.material_id`, materialId, { shouldDirty: true });

    if (!material) {
      return;
    }

    setValue(`items.${index}.description`, material.name, {
      shouldDirty: true,
    });
    setValue(`items.${index}.unit`, material.unit, { shouldDirty: true });
    setValue(
      `items.${index}.unit_price`,
      material.default_unit_price ? String(material.default_unit_price) : "",
      { shouldDirty: true, shouldTouch: true, shouldValidate: true },
    );
  }

  function onWorkerChange(index: number, workerId: string) {
    const worker = workers.find((item) => item.id === workerId);
    setValue(`items.${index}.worker_id`, workerId, { shouldDirty: true });

    if (!worker) {
      return;
    }

    setValue(
      `items.${index}.description`,
      `${worker.name} (${WORKER_ROLE_LABELS[worker.role]})`,
      { shouldDirty: true },
    );
    setValue(`items.${index}.unit`, "day", { shouldDirty: true });
    setValue(
      `items.${index}.unit_price`,
      worker.daily_wage ? String(worker.daily_wage) : "",
      { shouldDirty: true, shouldTouch: true, shouldValidate: true },
    );
  }

  function onItemTypeChange(
    index: number,
    itemType: QuotationFormValues["items"][number]["item_type"],
  ) {
    setValue(`items.${index}.item_type`, itemType, { shouldDirty: true });

    if (itemType !== "material") {
      setValue(`items.${index}.material_id`, "", { shouldDirty: true });
    }

    if (itemType !== "labour") {
      setValue(`items.${index}.worker_id`, "", { shouldDirty: true });
    }

    const currentUnit = watchedItems?.[index]?.unit;
    if (
      !currentUnit ||
      currentUnit === defaultUnitForItemType("custom") ||
      currentUnit === defaultUnitForItemType("labour") ||
      currentUnit === defaultUnitForItemType("material")
    ) {
      setValue(`items.${index}.unit`, defaultUnitForItemType(itemType), {
        shouldDirty: true,
      });
    }
  }

  function onDiscountTypeChange(value: string) {
    setValue("discount_type", value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

    if (!value) {
      setValue("discount_value", "", {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }

  async function submitWithAction(action: "draft" | "send") {
    setValue("submit_action", action, { shouldDirty: false });
    await handleSubmit(async (values) => {
      setFormError(null);
      const payload = {
        ...values,
        submit_action: action,
        project_id: lockedProjectId ?? values.project_id,
      };
      const result = quotation
        ? await requestJson<{ id: string }>(`/api/quotations/${quotation.id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await requestJson<{ id: string }>(createPath, {
            method: "POST",
            body: JSON.stringify(payload),
          });

      if (!result.ok) {
        setFormError(result.message);
        return;
      }

      router.push(`/quotations/${result.data.id}`);
      router.refresh();
    })();
  }

  const isEdit = Boolean(quotation);
  const hasUnsavedChanges = isEdit
    ? quotationFormSnapshot(watchedValues ?? defaultFormValues) !==
      baselineSnapshot
    : true;
  const saveDisabled = isSubmitting || !hasUnsavedChanges;

  return (
    <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <CompactPanel title="Header">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="title">Title</FieldLabel>
            <Input
              id="title"
              className="h-9"
              error={Boolean(errors.title)}
              {...register("title")}
            />
            {errors.title ? (
              <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
            ) : null}
          </div>
          <div>
            <FieldLabel htmlFor="client_name">Client name</FieldLabel>
            <Input
              id="client_name"
              className="h-9"
              error={Boolean(errors.client_name)}
              {...register("client_name")}
            />
            {errors.client_name ? (
              <p className="mt-1 text-xs text-red-600">
                {errors.client_name.message}
              </p>
            ) : null}
          </div>
          <div>
            <FieldLabel htmlFor="client_phone">Client phone</FieldLabel>
            <Input
              id="client_phone"
              className="h-9"
              {...register("client_phone")}
            />
          </div>
          <div>
            <FieldLabel htmlFor="client_email">Client email</FieldLabel>
            <Input
              id="client_email"
              type="email"
              className="h-9"
              autoComplete="email"
              error={Boolean(errors.client_email)}
              {...register("client_email")}
            />
            {errors.client_email ? (
              <p className="mt-1 text-xs text-red-600">
                {errors.client_email.message}
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-stone-500">
                Required to email this quotation to the client.
              </p>
            )}
          </div>
          <div>
            <FieldLabel htmlFor="quotation_date">Quotation date</FieldLabel>
            <Input
              id="quotation_date"
              type="date"
              className="h-9"
              error={Boolean(errors.quotation_date)}
              {...register("quotation_date")}
            />
          </div>
          <div>
            <FieldLabel htmlFor="valid_until">Valid until</FieldLabel>
            <Input
              id="valid_until"
              type="date"
              className="h-9"
              error={Boolean(errors.valid_until)}
              {...register("valid_until")}
            />
            {errors.valid_until ? (
              <p className="mt-1 text-xs text-red-600">
                {errors.valid_until.message}
              </p>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="client_address">Client address</FieldLabel>
            <Textarea
              id="client_address"
              rows={2}
              className="text-sm"
              {...register("client_address")}
            />
          </div>
          {lockedProjectId ? (
            <input type="hidden" {...register("project_id")} />
          ) : (
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="project_id">Project (optional)</FieldLabel>
              <Select id="project_id" className="h-9" {...register("project_id")}>
                <option value="">No project yet</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      </CompactPanel>

      <CompactPanel
        title="Items"
        action={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => append(emptyItem("custom"))}
            icon={Plus}
          >
            Add item
          </Button>
        }
      >
        {errors.items?.message ? (
          <p className="mb-2 text-xs text-red-600">{errors.items.message}</p>
        ) : null}
        <div className="space-y-2">
          {fields.map((field, index) => {
            const item = watchedItems?.[index];
            const lineTotal = calculateLineTotal(
              item?.quantity || "0",
              item?.unit_price || "0",
            );
            const itemErrors = errors.items?.[index];

            return (
              <div
                key={field.id}
                className="rounded-lg border border-stone-100 bg-stone-50/80 p-2.5"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-stone-600">
                    Item {index + 1}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => move(index, index - 1)}
                      disabled={index === 0}
                      icon={ArrowUp}
                    >
                      Up
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => move(index, index + 1)}
                      disabled={index === fields.length - 1}
                      icon={ArrowDown}
                    >
                      Down
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => remove(index)}
                      icon={Trash2}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
                  <input
                    type="hidden"
                    {...register(`items.${index}.worker_id`)}
                  />
                  <div>
                    <FieldLabel htmlFor={`item-type-${index}`}>Type</FieldLabel>
                    <Select
                      id={`item-type-${index}`}
                      className="h-9"
                      value={item?.item_type ?? "custom"}
                      onChange={(event) =>
                        onItemTypeChange(
                          index,
                          event.target
                            .value as QuotationFormValues["items"][number]["item_type"],
                        )
                      }
                    >
                      {QUOTATION_ITEM_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {QUOTATION_ITEM_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {item?.item_type === "material" ? (
                    <div className="sm:col-span-2">
                      <FieldLabel htmlFor={`item-material-${index}`}>
                        Material
                      </FieldLabel>
                      <Select
                        id={`item-material-${index}`}
                        className="h-9"
                        value={item.material_id}
                        error={Boolean(itemErrors?.material_id)}
                        onChange={(event) =>
                          onMaterialChange(index, event.target.value)
                        }
                      >
                        <option value="">Select material</option>
                        {materials.map((material) => (
                          <option key={material.id} value={material.id}>
                            {material.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ) : null}
                  {item?.item_type === "labour" ? (
                    <div className="sm:col-span-2">
                      <FieldLabel htmlFor={`item-worker-${index}`}>
                        Labour
                      </FieldLabel>
                      <Select
                        id={`item-worker-${index}`}
                        className="h-9"
                        value={item.worker_id ?? ""}
                        error={Boolean(itemErrors?.worker_id)}
                        onChange={(event) =>
                          onWorkerChange(index, event.target.value)
                        }
                      >
                        <option value="">Select labour</option>
                        {workers.map((worker) => (
                          <option key={worker.id} value={worker.id}>
                            {workerOptionLabel(worker)}
                          </option>
                        ))}
                      </Select>
                      {itemErrors?.worker_id ? (
                        <p className="mt-1 text-xs text-red-600">
                          {itemErrors.worker_id.message}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <div
                    className={
                      item?.item_type === "material" ||
                      item?.item_type === "labour"
                        ? "sm:col-span-2 lg:col-span-3"
                        : "sm:col-span-2 lg:col-span-5"
                    }
                  >
                    <FieldLabel htmlFor={`item-description-${index}`}>
                      Description
                    </FieldLabel>
                    <Input
                      id={`item-description-${index}`}
                      className="h-9"
                      error={Boolean(itemErrors?.description)}
                      {...register(`items.${index}.description`)}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor={`item-qty-${index}`}>Qty</FieldLabel>
                    <Input
                      id={`item-qty-${index}`}
                      className="h-9"
                      inputMode="decimal"
                      error={Boolean(itemErrors?.quantity)}
                      {...register(`items.${index}.quantity`)}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor={`item-unit-${index}`}>Unit</FieldLabel>
                    <Input
                      id={`item-unit-${index}`}
                      className="h-9"
                      list="quotation-units"
                      error={Boolean(itemErrors?.unit)}
                      {...register(`items.${index}.unit`)}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor={`item-price-${index}`}>Rate</FieldLabel>
                    <Input
                      id={`item-price-${index}`}
                      className="h-9"
                      inputMode="decimal"
                      error={Boolean(itemErrors?.unit_price)}
                      {...register(`items.${index}.unit_price`)}
                    />
                  </div>
                  <div>
                    <FieldLabel>Amount</FieldLabel>
                    <p className="flex h-9 items-center text-sm font-semibold tabular-nums text-stone-900">
                      {formatLabourCost(lineTotal)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <datalist id="quotation-units">
          {QUOTATION_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {QUOTATION_UNIT_LABELS[unit]}
            </option>
          ))}
        </datalist>
      </CompactPanel>

      <CompactPanel title="Summary">
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <FieldLabel htmlFor="discount_type">Discount</FieldLabel>
            <Select
              id="discount_type"
              className="h-9"
              value={discountType ?? ""}
              {...register("discount_type")}
              onChange={(event) => onDiscountTypeChange(event.target.value)}
            >
              <option value="">No discount</option>
              {DISCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {DISCOUNT_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="discount_value">
              {discountType === "percentage" ? "Discount %" : "Discount amount"}
            </FieldLabel>
            <Input
              id="discount_value"
              className="h-9"
              inputMode="decimal"
              error={Boolean(errors.discount_value || errors.discount_type)}
              {...register("discount_value", {
                setValueAs: (value) =>
                  value == null || value === "" ? "" : String(value).trim(),
              })}
            />
            {errors.discount_value ? (
              <p className="mt-1 text-xs text-red-600">
                {errors.discount_value.message}
              </p>
            ) : null}
            {errors.discount_type ? (
              <p className="mt-1 text-xs text-red-600">
                {errors.discount_type.message}
              </p>
            ) : null}
          </div>
          <div>
            <FieldLabel htmlFor="tax_percentage">Tax % (optional)</FieldLabel>
            <Input
              id="tax_percentage"
              className="h-9"
              inputMode="decimal"
              error={Boolean(errors.tax_percentage)}
              {...register("tax_percentage", {
                setValueAs: (value) =>
                  value == null || value === "" ? "" : String(value).trim(),
              })}
            />
            {errors.tax_percentage ? (
              <p className="mt-1 text-xs text-red-600">
                {errors.tax_percentage.message}
              </p>
            ) : null}
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-md bg-stone-50 px-2.5 py-2">
            <dt className="text-[11px] text-stone-500">Subtotal</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-stone-900">
              {formatLabourCost(previewTotals.subtotal)}
            </dd>
          </div>
          <div className="rounded-md bg-stone-50 px-2.5 py-2">
            <dt className="text-[11px] text-stone-500">
              Discount
              {discountType === "percentage" && discountValue
                ? ` (${discountValue}%)`
                : ""}
            </dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-stone-900">
              {formatLabourCost(previewTotals.discount_amount)}
            </dd>
          </div>
          <div className="rounded-md bg-stone-50 px-2.5 py-2">
            <dt className="text-[11px] text-stone-500">Tax</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-stone-900">
              {formatLabourCost(previewTotals.tax_amount)}
            </dd>
          </div>
          <div className="rounded-md bg-amber-50 px-2.5 py-2 ring-1 ring-amber-100">
            <dt className="text-[11px] text-stone-500">Total</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-stone-900">
              {formatLabourCost(previewTotals.total_amount)}
            </dd>
          </div>
        </dl>
      </CompactPanel>

      <CompactPanel title="Notes and terms">
        <div className="space-y-2">
          <div>
            <FieldLabel htmlFor="notes">Notes</FieldLabel>
            <Textarea
              id="notes"
              rows={3}
              className="text-sm"
              {...register("notes")}
            />
          </div>
          <div>
            <FieldLabel htmlFor="terms">Terms & conditions</FieldLabel>
            <Textarea
              id="terms"
              rows={4}
              className="text-sm"
              {...register("terms")}
            />
          </div>
        </div>
      </CompactPanel>

      <CompactPanel title="Save">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold tabular-nums text-stone-900">
            Total {formatLabourCost(previewTotals.total_amount)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={cancelHref}
              className={cn(linkButtonClassName("secondary", "sm"))}
            >
              <WithIcon icon={X}>Cancel</WithIcon>
            </Link>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={saveDisabled}
              onClick={() => void submitWithAction("draft")}
              icon={Save}
            >
              {isSubmitting ? "Saving..." : "Save draft"}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saveDisabled}
              onClick={() => void submitWithAction("send")}
              icon={Send}
            >
              {isSubmitting ? "Saving..." : "Save & send email"}
            </Button>
          </div>
        </div>
      </CompactPanel>
    </form>
  );
}
