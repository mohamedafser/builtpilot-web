import { z } from "zod";
import {
  ADJUSTMENT_DIRECTIONS,
  MATERIAL_CATEGORIES,
  MATERIAL_STATUSES,
  MATERIAL_UNITS,
} from "@/constants/material";

const optionalText = z
  .string()
  .trim()
  .max(200, "This field is too long.")
  .optional()
  .or(z.literal(""));

const optionalNotes = z
  .string()
  .trim()
  .max(5000, "Notes are too long.")
  .optional()
  .or(z.literal(""));

const requiredNotes = z
  .string({ error: "Notes are required." })
  .trim()
  .min(1, "Notes are required.")
  .max(5000, "Notes are too long.");

function toTrimmedString(value: string | number | null | undefined): string {
  if (value == null || value === "") {
    return "";
  }

  return String(value).trim();
}

const formOptionalMoney = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((value) => {
    if (!value) {
      return true;
    }

    if (!/^\d+(\.\d{1,2})?$/.test(value)) {
      return false;
    }

    return Number(value) >= 0;
  }, "Price must be 0 or greater, with up to 2 decimal places.");

const formOptionalQuantity = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((value) => {
    if (!value) {
      return true;
    }

    if (!/^\d+(\.\d{1,3})?$/.test(value)) {
      return false;
    }

    return Number(value) >= 0;
  }, "Quantity must be 0 or greater, with up to 3 decimal places.");

const optionalMoney = z
  .union([z.string(), z.number(), z.null()], {
    error: "Price must be 0 or greater, with up to 2 decimal places.",
  })
  .optional()
  .transform(toTrimmedString)
  .refine((value) => {
    if (!value) {
      return true;
    }

    if (!/^\d+(\.\d{1,2})?$/.test(value)) {
      return false;
    }

    return Number(value) >= 0;
  }, "Price must be 0 or greater, with up to 2 decimal places.");

const optionalQuantity = z
  .union([z.string(), z.number(), z.null()], {
    error: "Quantity must be 0 or greater, with up to 3 decimal places.",
  })
  .optional()
  .transform(toTrimmedString)
  .refine((value) => {
    if (!value) {
      return true;
    }

    if (!/^\d+(\.\d{1,3})?$/.test(value)) {
      return false;
    }

    return Number(value) >= 0;
  }, "Quantity must be 0 or greater, with up to 3 decimal places.");

const requiredQuantity = z
  .union([z.string(), z.number()], {
    error: "Quantity is required.",
  })
  .transform(toTrimmedString)
  .refine((value) => value.length > 0, {
    message: "Quantity is required.",
  })
  .refine((value) => /^\d+(\.\d{1,3})?$/.test(value), {
    message: "Quantity must be a number with up to 3 decimal places.",
  })
  .refine((value) => Number(value) > 0, {
    message: "Quantity must be greater than 0.",
  });

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

export const createMaterialSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Material name must be at least 2 characters.")
    .max(120, "Material name is too long."),
  category: z.enum(MATERIAL_CATEGORIES, {
    error: "Select a material category.",
  }),
  unit: z.enum(MATERIAL_UNITS, {
    error: "Select a unit.",
  }),
  default_unit_price: formOptionalMoney,
  minimum_stock: formOptionalQuantity,
  vendor_id: z
    .string()
    .uuid("Select a valid vendor.")
    .optional()
    .or(z.literal("")),
  notes: optionalNotes,
});

export const updateMaterialSchema = createMaterialSchema.extend({
  status: z.enum(MATERIAL_STATUSES),
});

/** Partial catalog update for materials list inline editors. */
export const patchMaterialCatalogSchema = z
  .object({
    default_unit_price: formOptionalMoney.optional(),
    minimum_stock: formOptionalQuantity.optional(),
    vendor_id: z
      .string()
      .uuid("Select a valid vendor.")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (value) =>
      value.default_unit_price !== undefined ||
      value.minimum_stock !== undefined ||
      value.vendor_id !== undefined,
    { message: "Nothing to update." },
  );

export const addProjectMaterialSchema = z.object({
  material_id: z.string().uuid("Select a valid material."),
  planned_quantity: optionalQuantity,
  minimum_stock: optionalQuantity,
});

export const assignMaterialToProjectsSchema = z.object({
  project_ids: z
    .array(z.string().uuid("Select a valid project."))
    .min(1, "Select at least one project.")
    .max(50, "Select up to 50 projects at a time."),
});

export const receiveMaterialSchema = z.object({
  material_id: z.string().uuid("Select a valid material."),
  vendor_id: z
    .string()
    .uuid("Select a valid vendor.")
    .optional()
    .or(z.literal("")),
  quantity: requiredQuantity,
  unit_price: optionalMoney,
  transaction_date: isoDate,
  reference_number: optionalText,
  notes: requiredNotes,
});

export const useMaterialSchema = z.object({
  material_id: z.string().uuid("Select a valid material."),
  vendor_id: z
    .string()
    .uuid("Select a valid vendor.")
    .optional()
    .or(z.literal("")),
  quantity: requiredQuantity,
  transaction_date: isoDate,
  notes: requiredNotes,
});

export const returnMaterialSchema = z.object({
  material_id: z.string().uuid("Select a valid material."),
  quantity: requiredQuantity,
  transaction_date: isoDate,
  notes: optionalNotes,
});

export const adjustMaterialSchema = z.object({
  material_id: z.string().uuid("Select a valid material."),
  adjustment_direction: z.enum(ADJUSTMENT_DIRECTIONS, {
    error: "Select increase or decrease.",
  }),
  quantity: requiredQuantity,
  transaction_date: isoDate,
  notes: z
    .string()
    .trim()
    .min(2, "Enter a reason for this adjustment.")
    .max(5000, "Notes are too long."),
});

export type CreateMaterialFormValues = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialFormValues = z.infer<typeof updateMaterialSchema>;
export type PatchMaterialCatalogValues = z.infer<
  typeof patchMaterialCatalogSchema
>;
export type MaterialFormValues = CreateMaterialFormValues & {
  status?: UpdateMaterialFormValues["status"];
};
export type AddProjectMaterialValues = z.infer<typeof addProjectMaterialSchema>;
export type AssignMaterialToProjectsValues = z.infer<
  typeof assignMaterialToProjectsSchema
>;
export type ReceiveMaterialValues = z.infer<typeof receiveMaterialSchema>;
export type UseMaterialValues = z.infer<typeof useMaterialSchema>;
export type ReturnMaterialValues = z.infer<typeof returnMaterialSchema>;
export type AdjustMaterialValues = z.infer<typeof adjustMaterialSchema>;
