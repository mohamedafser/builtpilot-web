import { z } from "zod";
import { ATTENDANCE_STATUSES } from "@/constants/worker";

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

const optionalHours = z
  .union([z.string(), z.number(), z.null()], {
    error: "Hours must be between 0 and 24.",
  })
  .optional()
  .transform((value) => {
    if (value == null || value === "") {
      return "";
    }

    return String(value).trim();
  })
  .refine((value) => {
    if (!value) {
      return true;
    }

    if (!/^\d+(\.\d{1,2})?$/.test(value)) {
      return false;
    }

    const hours = Number(value);
    return hours >= 0 && hours <= 24;
  }, "Hours must be between 0 and 24.");

const optionalNotes = z
  .string()
  .trim()
  .max(2000, "Notes are too long.")
  .optional()
  .or(z.literal(""));

export const assignWorkersSchema = z.object({
  worker_ids: z
    .array(z.string().uuid("Select a valid worker."))
    .min(1, "Select at least one worker."),
});

export const assignWorkerToProjectsSchema = z.object({
  project_ids: z
    .array(z.string().uuid("Select a valid project."))
    .min(1, "Select at least one project."),
});

export const assignWorkersToProjectsSchema = z.object({
  worker_ids: z
    .array(z.string().uuid("Select a valid worker."))
    .min(1, "Select at least one worker.")
    .max(100, "Select up to 100 workers at a time."),
  project_ids: z
    .array(z.string().uuid("Select a valid project."))
    .min(1, "Select at least one project.")
    .max(50, "Select up to 50 projects at a time."),
});

export const attendanceEntrySchema = z.object({
  worker_id: z.string().uuid("Select a valid worker."),
  status: z.enum(ATTENDANCE_STATUSES, {
    error: "Select present, half day, or absent.",
  }),
  hours_worked: optionalHours,
  notes: optionalNotes,
});

export const saveAttendanceSchema = z.object({
  attendance_date: isoDate,
  entries: z
    .array(attendanceEntrySchema)
    .min(1, "Mark attendance for at least one worker."),
});

export const labourSummaryQuerySchema = z
  .object({
    from: isoDate.optional(),
    to: isoDate.optional(),
  })
  .refine(
    (data) => {
      if (!data.from || !data.to) {
        return true;
      }

      return data.to >= data.from;
    },
    {
      message: "End date must be on or after the start date.",
      path: ["to"],
    },
  );

export type AssignWorkersValues = z.infer<typeof assignWorkersSchema>;
export type AssignWorkerToProjectsValues = z.infer<
  typeof assignWorkerToProjectsSchema
>;
export type AssignWorkersToProjectsValues = z.infer<
  typeof assignWorkersToProjectsSchema
>;
export type AttendanceEntryValues = z.infer<typeof attendanceEntrySchema>;
export type SaveAttendanceValues = z.infer<typeof saveAttendanceSchema>;
