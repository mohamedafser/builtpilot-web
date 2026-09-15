import { z } from "zod";
import {
  MANPOWER_ROLES,
  MATERIAL_TYPES,
  WEATHER_VALUES,
  type ManpowerCounts,
} from "@/constants/daily-report";

const optionalLongText = z
  .string()
  .trim()
  .max(10000, "This field is too long.")
  .optional()
  .or(z.literal(""));

const workerCountField = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((value) => {
    if (!value) {
      return true;
    }

    return /^\d+$/.test(value) && Number(value) <= 10000;
  }, "Enter a whole number between 0 and 10,000.");

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

export const materialEntrySchema = z.object({
  material_name: z
    .string()
    .trim()
    .min(1, "Material name is required.")
    .max(120, "Material name is too long."),
  quantity: z
    .string()
    .trim()
    .min(1, "Quantity is required.")
    .refine((value) => {
      const amount = Number(value);
      return Number.isFinite(amount) && amount > 0;
    }, "Quantity must be greater than 0."),
  unit: z
    .string()
    .trim()
    .min(1, "Unit is required.")
    .max(40, "Unit is too long."),
  type: z.enum(MATERIAL_TYPES),
});

export const dailyReportSchema = z.object({
  report_date: isoDate,
  weather: z.union([z.enum(WEATHER_VALUES), z.literal("")]).optional(),
  work_completed: z
    .string()
    .trim()
    .min(1, "Work completed is required.")
    .max(10000, "Work completed is too long."),
  issues: optionalLongText,
  tomorrow_plan: optionalLongText,
  general_notes: optionalLongText,
  manpower: z.object({
    mason: workerCountField,
    helper: workerCountField,
    carpenter: workerCountField,
    electrician: workerCountField,
    plumber: workerCountField,
    other: workerCountField,
  }),
  materials: z.array(materialEntrySchema),
});

export type DailyReportFormValues = z.infer<typeof dailyReportSchema>;
export type MaterialEntryValues = z.infer<typeof materialEntrySchema>;

export function parseManpowerCounts(
  values: DailyReportFormValues["manpower"],
): ManpowerCounts {
  return Object.fromEntries(
    MANPOWER_ROLES.map((role) => {
      const raw = values[role];
      return [role, raw ? Number(raw) : 0];
    }),
  ) as ManpowerCounts;
}

export function todayIsoDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isIsoDateOnOrBefore(value: string, maxDate: string): boolean {
  return value <= maxDate;
}

export function isIsoDateOnOrAfter(value: string, minDate: string): boolean {
  return value >= minDate;
}
