import { z } from "zod";
import { DISCOUNT_TYPES, QUOTATION_ITEM_TYPES } from "@/constants/quotation";

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

const optionalTerms = z
  .string()
  .trim()
  .max(8000, "Terms are too long.")
  .optional()
  .or(z.literal(""));

function toTrimmedString(value: unknown): string {
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

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

const optionalIsoDate = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((value) => {
    if (!value) {
      return true;
    }

    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }, "Enter a valid date.");

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

const requiredMoney = z
  .union([z.string(), z.number()], {
    error: "Unit price is required.",
  })
  .transform(toTrimmedString)
  .refine((value) => value.length > 0, {
    message: "Unit price is required.",
  })
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), {
    message: "Unit price must be a number with up to 2 decimal places.",
  })
  .refine((value) => Number(value) >= 0, {
    message: "Unit price must be 0 or greater.",
  });

const formRequiredMoney = z
  .string()
  .trim()
  .min(1, "Unit price is required.")
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), {
    message: "Unit price must be a number with up to 2 decimal places.",
  })
  .refine((value) => Number(value) >= 0, {
    message: "Unit price must be 0 or greater.",
  });

const optionalDiscountValue = z
  .union([z.string(), z.number(), z.null()], {
    error: "Enter a valid discount.",
  })
  .optional()
  .transform(toTrimmedString)
  .refine((value) => {
    if (!value) {
      return true;
    }

    return /^\d+(\.\d{1,2})?$/.test(value) && Number(value) >= 0;
  }, "Discount must be 0 or greater, with up to 2 decimal places.");

const formOptionalDiscountValue = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((value) => {
    if (!value) {
      return true;
    }

    return /^\d+(\.\d{1,2})?$/.test(value) && Number(value) >= 0;
  }, "Discount must be 0 or greater, with up to 2 decimal places.");

const optionalTaxPercentage = z
  .union([z.string(), z.number(), z.null()], {
    error: "Enter a valid tax percentage.",
  })
  .optional()
  .transform(toTrimmedString)
  .refine((value) => {
    if (!value) {
      return true;
    }

    return (
      /^\d+(\.\d{1,3})?$/.test(value) &&
      Number(value) >= 0 &&
      Number(value) <= 100
    );
  }, "Tax must be between 0 and 100, with up to 3 decimal places.");

const formOptionalTaxPercentage = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((value) => {
    if (!value) {
      return true;
    }

    return (
      /^\d+(\.\d{1,3})?$/.test(value) &&
      Number(value) >= 0 &&
      Number(value) <= 100
    );
  }, "Tax must be between 0 and 100, with up to 3 decimal places.");

const optionalDiscountType = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((value) => {
    if (!value) {
      return true;
    }

    return (DISCOUNT_TYPES as readonly string[]).includes(value);
  }, "Select a discount type.");

const quotationItemFields = {
  item_type: z.enum(QUOTATION_ITEM_TYPES, {
    error: "Select an item type.",
  }),
  material_id: optionalUuid,
  worker_id: optionalUuid,
  description: z
    .string()
    .trim()
    .min(1, "Description is required.")
    .max(200, "Description is too long."),
  unit: z
    .string()
    .trim()
    .min(1, "Unit is required.")
    .max(40, "Unit is too long."),
  notes: optionalNotes,
};

export const quotationItemSchema = z
  .object({
    ...quotationItemFields,
    quantity: requiredQuantity,
    unit_price: requiredMoney,
  })
  .superRefine((item, ctx) => {
    if (item.item_type === "material" && !item.material_id) {
      ctx.addIssue({
        code: "custom",
        message: "Select a material.",
        path: ["material_id"],
      });
    }

    if (item.item_type !== "material" && item.material_id) {
      ctx.addIssue({
        code: "custom",
        message: "Only material items can link to a catalog material.",
        path: ["material_id"],
      });
    }

    if (item.item_type === "labour" && !item.worker_id) {
      ctx.addIssue({
        code: "custom",
        message: "Select a worker.",
        path: ["worker_id"],
      });
    }

    if (item.item_type !== "labour" && item.worker_id) {
      ctx.addIssue({
        code: "custom",
        message: "Only labour items can link to a worker.",
        path: ["worker_id"],
      });
    }
  });

export const quotationItemFormSchema = z
  .object({
    ...quotationItemFields,
    quantity: formRequiredQuantity,
    unit_price: formRequiredMoney,
  })
  .superRefine((item, ctx) => {
    if (item.item_type === "material" && !item.material_id) {
      ctx.addIssue({
        code: "custom",
        message: "Select a material.",
        path: ["material_id"],
      });
    }

    if (item.item_type === "labour" && !item.worker_id) {
      ctx.addIssue({
        code: "custom",
        message: "Select a worker.",
        path: ["worker_id"],
      });
    }
  });

const quotationFields = {
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters.")
    .max(120, "Title is too long."),
  client_name: z
    .string()
    .trim()
    .min(1, "Client name is required.")
    .max(200, "Client name is too long."),
  client_phone: optionalText,
  client_email: z
    .string()
    .trim()
    .max(254, "Email address is too long.")
    .optional()
    .or(z.literal(""))
    .refine((value) => {
      if (!value) {
        return true;
      }

      return z.string().email().safeParse(value).success;
    }, "Enter a valid email address."),
  client_address: z
    .string()
    .trim()
    .max(500, "Address is too long.")
    .optional()
    .or(z.literal("")),
  quotation_date: isoDate,
  valid_until: optionalIsoDate,
  project_id: optionalUuid,
  discount_type: optionalDiscountType,
  notes: optionalNotes,
  terms: optionalTerms,
  submit_action: z.enum(["draft", "send"]).optional(),
};

function requireEmailWhenSending(
  data: { submit_action?: string; client_email?: string },
  ctx: z.RefinementCtx,
) {
  if (data.submit_action === "send" && !data.client_email?.trim()) {
    ctx.addIssue({
      code: "custom",
      message: "Add a client email to send this quotation.",
      path: ["client_email"],
    });
  }
}

function discountAndDatesRefine(
  data: {
    quotation_date: string;
    valid_until?: string;
    discount_type?: string;
    discount_value?: string;
  },
  ctx: z.RefinementCtx,
) {
  if (data.valid_until && data.valid_until < data.quotation_date) {
    ctx.addIssue({
      code: "custom",
      message: "Valid until must be on or after the quotation date.",
      path: ["valid_until"],
    });
  }

  if (data.discount_value && Number(data.discount_value) > 0 && !data.discount_type) {
    ctx.addIssue({
      code: "custom",
      message: "Select a discount type.",
      path: ["discount_type"],
    });
  }

  if (data.discount_type === "percentage" && data.discount_value) {
    if (Number(data.discount_value) > 100) {
      ctx.addIssue({
        code: "custom",
        message: "Percentage discount cannot be greater than 100.",
        path: ["discount_value"],
      });
    }
  }
}

export const createQuotationSchema = z
  .object({
    ...quotationFields,
    discount_value: optionalDiscountValue,
    tax_percentage: optionalTaxPercentage,
    items: z.array(quotationItemSchema).min(1, "Add at least one item."),
  })
  .superRefine(discountAndDatesRefine)
  .superRefine(requireEmailWhenSending);

export const createQuotationFormSchema = z
  .object({
    ...quotationFields,
    discount_value: formOptionalDiscountValue,
    tax_percentage: formOptionalTaxPercentage,
    items: z.array(quotationItemFormSchema).min(1, "Add at least one item."),
  })
  .superRefine(discountAndDatesRefine)
  .superRefine(requireEmailWhenSending);

export const updateQuotationSchema = createQuotationSchema;
export const updateQuotationFormSchema = createQuotationFormSchema;

export const rejectQuotationSchema = z.object({
  rejection_reason: z
    .string()
    .trim()
    .max(2000, "Rejection reason is too long.")
    .optional()
    .or(z.literal("")),
});

export type QuotationFormValues = z.infer<typeof createQuotationFormSchema>;
export type QuotationItemFormValues = z.infer<typeof quotationItemFormSchema>;
