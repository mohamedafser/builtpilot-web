import { isMissingSchemaError } from "@/lib/auth/errors";
import {
  emptyToNull,
  isProjectUuid,
  sanitizeSearchTerm,
} from "@/lib/projects/helpers";

export type LabourMutationResult =
  | { error: string; status?: number }
  | { success: true; id?: string; ids?: string[] };

export const isUuid = isProjectUuid;

export { emptyToNull, sanitizeSearchTerm };

export function getLabourErrorMessage(error: {
  message: string;
  code?: string;
}): string {
  if (isMissingSchemaError(error)) {
    return "The database schema is not fully set up. Run the latest Supabase migration.";
  }

  const message = error.message.toLowerCase();
  const code = error.code ?? "";

  if (
    code === "23505" ||
    message.includes("worker_attendance_unique_day")
  ) {
    return "Attendance already exists for this worker on this date.";
  }

  if (message.includes("project_workers_unique_assignment")) {
    return "This worker is already assigned to the project.";
  }

  if (message.includes("cannot change project worker")) {
    return "Assignment project, worker, and business cannot be changed.";
  }

  if (message.includes("cannot change attendance")) {
    return "Attendance business, project, and worker cannot be changed.";
  }

  if (message.includes("worker_attendance_hours_range")) {
    return "Hours worked must be between 0 and 24.";
  }

  if (message.includes("worker_attendance_wage_non_negative")) {
    return "Wage must be 0 or greater.";
  }

  if (
    message.includes("workers") ||
    message.includes("project_workers") ||
    message.includes("worker_attendance")
  ) {
    return "Labour tables are missing in the database. Run supabase/migrations/20240912160000_labour_management.sql.";
  }

  if (code === "42501") {
    return "You do not have permission to complete this action.";
  }

  return "Unable to complete this action. Please try again.";
}
