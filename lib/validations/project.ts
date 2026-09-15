import { z } from "zod";
import { PROJECT_STATUSES } from "@/constants/project";

const optionalText = z
  .string()
  .trim()
  .max(200, "This field is too long.")
  .optional()
  .or(z.literal(""));

const optionalDescription = z
  .string()
  .trim()
  .max(5000, "Description is too long.")
  .optional()
  .or(z.literal(""));

const optionalEmail = z
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
  }, "Enter a valid email address.");

const optionalBudget = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((value) => {
    if (!value) {
      return true;
    }

    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0;
  }, "Budget must be 0 or greater.");

const requiredText = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(200, "This field is too long.");

const requiredDate = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .regex(/^\d{4}-\d{2}-\d{2}$/, `Enter a valid ${label.toLowerCase()}.`);

const endDateAfterStart = (
  data: { start_date?: string; expected_end_date?: string },
) => {
  if (!data.start_date || !data.expected_end_date) {
    return true;
  }

  return data.expected_end_date >= data.start_date;
};

/** Used for edit — optional fields allowed. */
export const projectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Project name must be at least 2 characters.")
      .max(120, "Project name is too long."),
    client_name: optionalText,
    client_phone: optionalText,
    client_email: optionalEmail,
    location: optionalText,
    description: optionalDescription,
    estimated_budget: optionalBudget,
    status: z.enum(PROJECT_STATUSES),
    start_date: optionalText,
    expected_end_date: optionalText,
  })
  .refine(endDateAfterStart, {
    message: "Expected end date must be on or after the start date.",
    path: ["expected_end_date"],
  });

/** Frontend-only create validation — all fields required. */
export const createProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Project name must be at least 2 characters.")
      .max(120, "Project name is too long."),
    client_name: requiredText("Client name"),
    client_phone: requiredText("Client phone"),
    client_email: z
      .string()
      .trim()
      .min(1, "Client email is required.")
      .max(254, "Email address is too long.")
      .email("Enter a valid email address."),
    location: requiredText("Location"),
    description: z
      .string()
      .trim()
      .min(1, "Description is required.")
      .max(5000, "Description is too long."),
    estimated_budget: z
      .string()
      .trim()
      .min(1, "Estimated budget is required.")
      .refine((value) => {
        const amount = Number(value);
        return Number.isFinite(amount) && amount >= 0;
      }, "Budget must be 0 or greater."),
    status: z.enum(PROJECT_STATUSES),
    start_date: requiredDate("Start date"),
    expected_end_date: requiredDate("Expected end date"),
  })
  .refine(endDateAfterStart, {
    message: "Expected end date must be on or after the start date.",
    path: ["expected_end_date"],
  });

export type ProjectFormValues = z.infer<typeof projectSchema>;
export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;
