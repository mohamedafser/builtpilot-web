import { isMissingSchemaError } from "@/lib/auth/errors";

export type DailyReportMutationResult =
  | { error: string; id?: string; status?: number }
  | { success: true; id: string };

export {
  emptyToNull,
  formatWorkerCount,
  isUuid,
  previewText,
  sanitizeFileName,
  sanitizeSearchTerm,
  workPreview,
} from "./display";

export function getDailyReportErrorMessage(error: {
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
    message.includes("daily_site_reports_project_date_active")
  ) {
    return "A daily report already exists for this date.";
  }

  if (message.includes("daily_site_reports_work_completed_present")) {
    return "Work completed is required.";
  }

  if (message.includes("cannot change daily report")) {
    return "The project, business, and author for a daily report cannot be changed.";
  }

  if (message.includes("cannot change site photo")) {
    return "Photo ownership cannot be changed.";
  }

  if (
    message.includes("bucket") ||
    (message.includes("not found") && message.includes("storage"))
  ) {
    return "Site photo storage is not set up. Run the latest Supabase migration.";
  }

  if (message.includes("mime type") || message.includes("invalid file")) {
    return "That image type is not supported. Use JPEG, PNG, WebP, or HEIC.";
  }

  if (message.includes("maximum allowed size") || message.includes("payload")) {
    return "That photo is too large. Use an image under 10 MB.";
  }

  if (
    message.includes("daily_site_reports") ||
    message.includes("site_photos") ||
    message.includes("daily_report_manpower") ||
    message.includes("daily_report_materials")
  ) {
    return "Daily report tables are missing in the database. Run supabase/migrations/20240912140000_daily_site_diary.sql.";
  }

  return "Unable to complete this action. Please try again.";
}
