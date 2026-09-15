"use client";

import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_PAYMENT_METHOD_LABELS,
  EXPENSE_PAYMENT_METHODS,
  expenseToFormValues,
} from "@/constants/expense";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WithIcon } from "@/components/ui/with-icon";
import { Plus, Save, X } from "lucide-react";
import { requestFormData, requestJson } from "@/lib/api/client";
import { todayIsoDate } from "@/lib/labour/money";
import { showToast } from "@/lib/toast";
import {
  createExpenseFormSchema,
  updateExpenseFormSchema,
  type ExpenseFormValues,
} from "@/lib/validations/expense";
import type { ExpenseDetail } from "@/lib/expenses/types";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

export function ExpenseForm({
  projectId,
  expense,
}: {
  projectId: string;
  expense?: ExpenseDetail;
}) {
  const isEdit = Boolean(expense);
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const schema = isEdit ? updateExpenseFormSchema : createExpenseFormSchema;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: expense
      ? expenseToFormValues(expense)
      : {
          category: "transport",
          description: "",
          amount: "",
          expense_date: todayIsoDate(),
          vendor_id: "",
          payment_method: "",
          reference_number: "",
          notes: "",
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
        expense?.vendor_id &&
        !loaded.some((vendor) => vendor.id === expense.vendor_id)
      ) {
        loaded.unshift({
          id: expense.vendor_id,
          name: expense.vendor_name || "Selected vendor",
        });
      }

      setVendors(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, [expense]);

  async function onSubmit(values: ExpenseFormValues) {
    setFormError(null);

    const result = expense
      ? await requestJson<{ id: string }>(
          `/api/projects/${projectId}/expenses/${expense.id}`,
          {
            method: "PATCH",
            body: JSON.stringify(values),
          },
        )
      : await requestJson<{ id: string }>(
          `/api/projects/${projectId}/expenses`,
          {
            method: "POST",
            body: JSON.stringify(values),
          },
        );

    if (!result.ok) {
      showToast(result.message, "error");
      setFormError(result.message);
      return;
    }

    const expenseId = result.data.id;

    if (receiptFile) {
      const formData = new FormData();
      formData.append("file", receiptFile);
      const upload = await requestFormData<{ expense: ExpenseDetail }>(
        `/api/projects/${projectId}/expenses/${expenseId}/receipt`,
        formData,
      );

      if (!upload.ok) {
        showToast(upload.message, "error");
        setFormError(upload.message);
        router.push(`/projects/${projectId}/expenses/${expenseId}`);
        router.refresh();
        return;
      }
    }

    showToast(result.message, "success");
    router.push(`/projects/${projectId}/expenses/${expenseId}`);
    router.refresh();
  }

  const cancelHref = expense
    ? `/projects/${projectId}/expenses/${expense.id}`
    : `/projects/${projectId}/expenses`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <div>
        <Label htmlFor="category">Category</Label>
        <Select
          id="category"
          className="h-12 text-base"
          error={Boolean(errors.category)}
          {...register("category")}
        >
          {EXPENSE_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {EXPENSE_CATEGORY_LABELS[value]}
            </option>
          ))}
        </Select>
        {errors.category ? (
          <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          className="h-12 text-base"
          error={Boolean(errors.description)}
          placeholder="Sand delivery to site"
          {...register("description")}
        />
        {errors.description ? (
          <p className="mt-1 text-sm text-red-600">
            {errors.description.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            inputMode="decimal"
            className="h-12 text-base"
            error={Boolean(errors.amount)}
            placeholder="3500"
            {...register("amount")}
          />
          {errors.amount ? (
            <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="expense_date">Date</Label>
          <Input
            id="expense_date"
            type="date"
            className="h-12 text-base"
            error={Boolean(errors.expense_date)}
            {...register("expense_date")}
          />
          {errors.expense_date ? (
            <p className="mt-1 text-sm text-red-600">
              {errors.expense_date.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="vendor_id">Vendor (optional)</Label>
          <Select
            id="vendor_id"
            className="h-12 text-base"
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
        <div>
          <Label htmlFor="payment_method">Payment method (optional)</Label>
          <Select
            id="payment_method"
            className="h-12 text-base"
            error={Boolean(errors.payment_method)}
            {...register("payment_method")}
          >
            <option value="">Not specified</option>
            {EXPENSE_PAYMENT_METHODS.map((value) => (
              <option key={value} value={value}>
                {EXPENSE_PAYMENT_METHOD_LABELS[value]}
              </option>
            ))}
          </Select>
          {errors.payment_method ? (
            <p className="mt-1 text-sm text-red-600">
              {errors.payment_method.message}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <Label htmlFor="reference_number">Reference number (optional)</Label>
        <Input
          id="reference_number"
          className="h-12 text-base"
          error={Boolean(errors.reference_number)}
          placeholder="TRN-1023"
          {...register("reference_number")}
        />
        {errors.reference_number ? (
          <p className="mt-1 text-sm text-red-600">
            {errors.reference_number.message}
          </p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="receipt">Receipt (optional)</Label>
        <Input
          id="receipt"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="h-12 py-2 text-base"
          onChange={(event) => {
            setReceiptFile(event.target.files?.[0] ?? null);
          }}
        />
        <p className="mt-1 text-xs text-stone-500">
          JPEG, PNG, WebP, or PDF up to 10 MB.
          {expense?.receipt_path
            ? " Uploading a new file replaces the current receipt."
            : ""}
        </p>
      </div>

      <div>
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" error={Boolean(errors.notes)} {...register("notes")} />
        {errors.notes ? (
          <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link
          href={cancelHref}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 sm:h-10"
        >
          <WithIcon icon={X}>Cancel</WithIcon>
        </Link>
        <Button
          type="submit"
          disabled={isSubmitting || (isEdit && !isDirty && !receiptFile)}
          className="h-12 sm:h-10"
          icon={isEdit ? Save : Plus}
        >
          {isSubmitting
            ? isEdit
              ? "Saving..."
              : "Saving..."
            : isEdit
              ? "Save expense"
              : "Add expense"}
        </Button>
      </div>
    </form>
  );
}
