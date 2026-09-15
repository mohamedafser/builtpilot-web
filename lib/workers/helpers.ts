import { isMissingSchemaError } from "@/lib/auth/errors";
import {
  emptyToNull,
  isProjectUuid,
  sanitizeSearchTerm,
} from "@/lib/projects/helpers";

export type WorkerMutationResult =
  | { error: string; status?: number }
  | { success: true; id: string };

export const isUuid = isProjectUuid;

export { emptyToNull, sanitizeSearchTerm };

export function getWorkerErrorMessage(error: {
  message: string;
  code?: string;
}): string {
  if (isMissingSchemaError(error)) {
    return "The database schema is not fully set up. Run the latest Supabase migration.";
  }

  const message = error.message.toLowerCase();
  const code = error.code ?? "";

  if (message.includes("cannot move a worker")) {
    return "Workers cannot be moved to another business.";
  }

  if (message.includes("workers_name_present")) {
    return "Worker name must be at least 2 characters.";
  }

  if (message.includes("workers_daily_wage_non_negative")) {
    return "Daily wage must be 0 or greater.";
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
