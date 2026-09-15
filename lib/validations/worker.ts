import { z } from "zod";
import { WORKER_ROLES, WORKER_STATUSES } from "@/constants/worker";

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

const dailyWageSchema = z
  .string()
  .trim()
  .min(1, "Daily wage is required.")
  .refine((value) => {
    if (!/^\d+(\.\d{1,2})?$/.test(value)) {
      return false;
    }

    return Number(value) >= 0;
  }, "Daily wage must be 0 or greater, with up to 2 decimal places.");

export const createWorkerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Worker name must be at least 2 characters.")
    .max(120, "Worker name is too long."),
  phone: optionalText,
  role: z.enum(WORKER_ROLES),
  daily_wage: dailyWageSchema,
  notes: optionalNotes,
});

export const updateWorkerSchema = createWorkerSchema.extend({
  status: z.enum(WORKER_STATUSES),
});

export type CreateWorkerFormValues = z.infer<typeof createWorkerSchema>;
export type UpdateWorkerFormValues = z.infer<typeof updateWorkerSchema>;
export type WorkerFormValues = CreateWorkerFormValues & {
  status?: UpdateWorkerFormValues["status"];
};
