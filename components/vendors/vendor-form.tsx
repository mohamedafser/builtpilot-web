"use client";

import {
  VENDOR_STATUS_LABELS,
  VENDOR_STATUSES,
  vendorToFormValues,
} from "@/constants/vendor";
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
  createVendorSchema,
  updateVendorSchema,
  type VendorFormValues,
} from "@/lib/validations/vendor";
import type { Vendor } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

export function VendorForm({ vendor }: { vendor?: Vendor }) {
  const isEdit = Boolean(vendor);
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const schema = isEdit ? updateVendorSchema : createVendorSchema;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(schema),
    defaultValues: vendor
      ? vendorToFormValues(vendor)
      : {
          name: "",
          contact_person: "",
          phone: "",
          email: "",
          address: "",
          notes: "",
          status: "active",
        },
  });

  async function onSubmit(values: VendorFormValues) {
    setFormError(null);

    const result = vendor
      ? await requestJson<{ id: string }>(`/api/vendors/${vendor.id}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        })
      : await requestJson<{ id: string }>("/api/vendors", {
          method: "POST",
          body: JSON.stringify(values),
        });

    if (!result.ok) {
      showToast(result.message, "error");
      setFormError(result.message);
      return;
    }

    showToast(result.message, "success");
    router.push(`/vendors/${result.data.id}`);
    router.refresh();
  }

  const cancelHref = vendor ? `/vendors/${vendor.id}` : "/vendors";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">
            Vendor name <span className="text-red-600">*</span>
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
          <Label htmlFor="contact_person">Contact person</Label>
          <Input
            id="contact_person"
            className="h-12 sm:h-10"
            error={Boolean(errors.contact_person)}
            {...register("contact_person")}
          />
          {errors.contact_person ? (
            <p className="mt-1 text-sm text-red-600">
              {errors.contact_person.message}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            className="h-12 sm:h-10"
            error={Boolean(errors.phone)}
            {...register("phone")}
          />
          {errors.phone ? (
            <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            className="h-12 sm:h-10"
            error={Boolean(errors.email)}
            {...register("email")}
          />
          {errors.email ? (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
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
              {VENDOR_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {VENDOR_STATUS_LABELS[status]}
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
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            rows={3}
            error={Boolean(errors.address)}
            {...register("address")}
          />
          {errors.address ? (
            <p className="mt-1 text-sm text-red-600">
              {errors.address.message}
            </p>
          ) : null}
        </div>

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
              : "Create vendor"}
        </Button>
      </div>
    </form>
  );
}
