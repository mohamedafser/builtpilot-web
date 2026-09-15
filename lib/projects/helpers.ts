import { isMissingSchemaError } from "@/lib/auth/errors";

export type ProjectMutationResult =
  { error: string } | { success: true; id?: string };

export function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function parseBudget(value: string | undefined): number | null {
  if (!value || value.trim() === "") {
    return null;
  }

  return Number(value);
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function isProjectUuid(value: string): boolean {
  return isUuid(value);
}

export function sanitizeSearchTerm(value: string): string {
  return value
    .trim()
    .replace(/[%_,.()\\*'"]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

export function getProjectErrorMessage(error: {
  message: string;
  code?: string;
}): string {
  if (isMissingSchemaError(error)) {
    return "The database schema is not fully set up. Run the latest Supabase migration.";
  }

  const message = error.message.toLowerCase();

  if (
    message.includes("archived_at") ||
    message.includes("client_email") ||
    message.includes("client_phone") ||
    message.includes("description")
  ) {
    return "Project fields are missing in the database. Run supabase/migrations/20240912120000_project_management.sql.";
  }

  if (message.includes("projects_dates_ordered")) {
    return "Expected end date must be on or after the start date.";
  }

  if (message.includes("projects_budget_non_negative")) {
    return "Budget must be 0 or greater.";
  }

  if (message.includes("cannot move a project")) {
    return "Projects cannot be moved to another business.";
  }

  return "Unable to complete this action. Please try again.";
}
