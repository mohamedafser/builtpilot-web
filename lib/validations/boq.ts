import { z } from "zod";
import { BOQ_ITEM_TYPES, BOQ_UNITS } from "@/constants/boq";

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

const optionalDescription = z
  .string()
  .trim()
  .max(2000, "Description is too long.")
  .optional()
  .or(z.literal(""));

function toTrimmedString(value: string | number | null | undefined): string {
  if (value == null || value === "") {
    return "";
  }

  return String(value).trim();
}

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((value) => {
    if (!value) {
      return true;
    }

    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    );
  }, "Select a valid value.");

const requiredUuid = z
  .string()
  .trim()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "Select a valid value.",
  );

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

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

const formRequiredQuantity = z
  .string()
  .trim()
  .min(1, "Quantity is required.")
  .refine((value) => /^\d+(\.\d{1,3})?$/.test(value), {
    message: "Quantity must be a number with up to 3 decimal places.",
  })
  .refine((value) => Number(value) > 0, {
    message: "Quantity must be greater than 0.",
  });

const requiredRate = z
  .union([z.string(), z.number()], {
    error: "Rate is required.",
  })
  .transform(toTrimmedString)
  .refine((value) => value.length > 0, {
    message: "Rate is required.",
  })
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), {
    message: "Rate must be a number with up to 2 decimal places.",
  })
  .refine((value) => Number(value) >= 0, {
    message: "Rate must be 0 or greater.",
  });

const formRequiredRate = z
  .string()
  .trim()
  .min(1, "Rate is required.")
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), {
    message: "Rate must be a number with up to 2 decimal places.",
  })
  .refine((value) => Number(value) >= 0, {
    message: "Rate must be 0 or greater.",
  });

const boqName = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(120, "Name is too long.");

export const createBoqSchema = z.object({
  name: boqName,
  description: optionalDescription,
  quotation_id: optionalUuid,
  template_id: optionalText,
});

export const createBoqFormSchema = z.object({
  name: boqName,
  description: optionalDescription,
  quotation_id: optionalUuid,
  template_id: optionalText,
});

export const updateBoqSchema = z.object({
  name: boqName,
  description: optionalDescription,
});

export const updateBoqFormSchema = updateBoqSchema;

export const createBoqSectionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Section name is required.")
    .max(120, "Section name is too long."),
  description: optionalDescription,
});

export const createBoqSectionFormSchema = createBoqSectionSchema;

export const updateBoqSectionSchema = createBoqSectionSchema;

export const reorderSchema = z.object({
  ids: z.array(requiredUuid).min(1, "Select items to reorder."),
});

const itemFields = {
  section_id: optionalUuid,
  item_code: optionalText,
  description: z
    .string()
    .trim()
    .min(1, "Description is required.")
    .max(500, "Description is too long."),
  item_type: z.enum(BOQ_ITEM_TYPES, {
    error: "Select an item type.",
  }),
  material_id: optionalUuid,
  unit: z.enum(BOQ_UNITS, {
    error: "Select a unit.",
  }),
  notes: optionalNotes,
};

export const createBoqItemSchema = z
  .object({
    ...itemFields,
    estimated_quantity: requiredQuantity,
    rate: requiredRate,
  })
  .superRefine((value, ctx) => {
    if (value.item_type !== "material" && value.material_id) {
      ctx.addIssue({
        code: "custom",
        path: ["material_id"],
        message: "Only material items can use a catalog material.",
      });
    }
  });

export const createBoqItemFormSchema = z
  .object({
    ...itemFields,
    estimated_quantity: formRequiredQuantity,
    rate: formRequiredRate,
  })
  .superRefine((value, ctx) => {
    if (value.item_type !== "material" && value.material_id) {
      ctx.addIssue({
        code: "custom",
        path: ["material_id"],
        message: "Only material items can use a catalog material.",
      });
    }
  });

export const updateBoqItemSchema = createBoqItemSchema;
export const updateBoqItemFormSchema = createBoqItemFormSchema;

export const createMeasurementSchema = z.object({
  measurement_date: isoDate,
  quantity: requiredQuantity,
  unit: z.enum(BOQ_UNITS, {
    error: "Select a unit.",
  }),
  location: optionalText,
  description: optionalDescription,
  reference: optionalText,
  notes: optionalNotes,
});

export const createMeasurementFormSchema = z.object({
  measurement_date: isoDate,
  quantity: formRequiredQuantity,
  unit: z.enum(BOQ_UNITS, {
    error: "Select a unit.",
  }),
  location: optionalText,
  description: optionalDescription,
  reference: optionalText,
  notes: optionalNotes,
});

export const createBoqFromQuotationSchema = z.object({
  quotation_id: requiredUuid,
  name: boqName.optional(),
  description: optionalDescription,
});

export type CreateBoqInput = z.infer<typeof createBoqSchema>;
export type CreateBoqFormInput = z.infer<typeof createBoqFormSchema>;
export type UpdateBoqInput = z.infer<typeof updateBoqSchema>;
export type CreateBoqSectionInput = z.infer<typeof createBoqSectionSchema>;
export type CreateBoqItemInput = z.infer<typeof createBoqItemSchema>;
export type CreateBoqItemFormInput = z.infer<typeof createBoqItemFormSchema>;
export type CreateMeasurementInput = z.infer<typeof createMeasurementSchema>;
export type CreateMeasurementFormInput = z.infer<
  typeof createMeasurementFormSchema
>;
export type CreateBoqFromQuotationInput = z.infer<
  typeof createBoqFromQuotationSchema
>;
