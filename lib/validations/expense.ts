import { z } from "zod";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
} from "@/constants/expense";

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
  }, "Select a valid vendor.");

const optionalPaymentMethod = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((value) => {
    if (!value) {
      return true;
    }

    return (EXPENSE_PAYMENT_METHODS as readonly string[]).includes(value);
  }, "Select a payment method.");

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

const requiredAmount = z
  .union([z.string(), z.number()], {
    error: "Amount is required.",
  })
  .transform(toTrimmedString)
  .refine((value) => value.length > 0, {
    message: "Amount is required.",
  })
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), {
    message: "Amount must be a number with up to 2 decimal places.",
  })
  .refine((value) => Number(value) > 0, {
    message: "Amount must be greater than 0.",
  });

const formRequiredAmount = z
  .string()
  .trim()
  .min(1, "Amount is required.")
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), {
    message: "Amount must be a number with up to 2 decimal places.",
  })
  .refine((value) => Number(value) > 0, {
    message: "Amount must be greater than 0.",
  });

const expenseFields = {
  category: z.enum(EXPENSE_CATEGORIES, {
    error: "Select a category.",
  }),
  description: z
    .string()
    .trim()
    .min(1, "Description is required.")
    .max(200, "Description is too long."),
  expense_date: isoDate,
  vendor_id: optionalUuid,
  payment_method: optionalPaymentMethod,
  reference_number: optionalText,
  notes: optionalNotes,
};

export const createExpenseSchema = z.object({
  ...expenseFields,
  amount: requiredAmount,
});

export const createExpenseFormSchema = z.object({
  ...expenseFields,
  amount: formRequiredAmount,
});

export const updateExpenseSchema = createExpenseSchema;
export const updateExpenseFormSchema = createExpenseFormSchema;

export type ExpenseFormValues = z.infer<typeof createExpenseFormSchema>;
