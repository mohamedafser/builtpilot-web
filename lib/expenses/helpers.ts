import { revalidatePath } from "next/cache";
import { isMissingSchemaError } from "@/lib/auth/errors";
import { emptyToNull, sanitizeFileName, sanitizeSearchTerm } from "@/lib/daily-reports/helpers";
import { isProjectUuid } from "@/lib/projects/helpers";

export type ExpenseMutationResult =
  | { error: string; status?: number }
  | { success: true; id: string };

export const isUuid = isProjectUuid;

export { emptyToNull, sanitizeFileName, sanitizeSearchTerm };

export function getExpenseErrorMessage(error: {
  message: string;
  code?: string;
}): string {
  if (isMissingSchemaError(error)) {
    return "The database schema is not fully set up. Run the latest Supabase migration.";
  }

  const message = error.message.toLowerCase();
  const code = error.code ?? "";

  if (message.includes("expense vendor must belong")) {
    return "That vendor does not belong to this workspace.";
  }

  if (message.includes("expense project must belong")) {
    return "That project does not belong to this workspace.";
  }

  if (message.includes("cannot change expense")) {
    return "Expense business, project, and creator cannot be changed.";
  }

  if (message.includes("project_expenses_amount_positive")) {
    return "Amount must be greater than 0.";
  }

  if (message.includes("project_expenses_description_present")) {
    return "Description is required.";
  }

  if (
    message.includes("bucket") ||
    (message.includes("not found") && message.includes("storage"))
  ) {
    return "Expense receipt storage is not set up. Run the latest Supabase migration.";
  }

  if (message.includes("mime type") || message.includes("invalid file")) {
    return "That file type is not supported. Use JPEG, PNG, WebP, or PDF.";
  }

  if (message.includes("maximum allowed size") || message.includes("payload")) {
    return "That receipt is too large. Use a file under 10 MB.";
  }

  if (message.includes("project_expenses")) {
    return "Expense tables are missing in the database. Run supabase/migrations/20240913160000_project_expenses.sql.";
  }

  if (code === "42501") {
    return "You do not have permission to complete this action.";
  }

  return "Unable to complete this action. Please try again.";
}

export function revalidateExpensePaths(
  projectId: string,
  expenseId?: string,
  vendorId?: string | null,
) {
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath("/vendors");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/expenses`);
  revalidatePath(`/projects/${projectId}/expenses/new`);

  if (expenseId) {
    revalidatePath(`/projects/${projectId}/expenses/${expenseId}`);
    revalidatePath(`/projects/${projectId}/expenses/${expenseId}/edit`);
  }

  if (vendorId) {
    revalidatePath(`/vendors/${vendorId}`);
  }
}

export function expenseMutationStatus(error: string, status?: number) {
  if (status) {
    return status;
  }

  if (error === "Project not found." || error === "Expense not found.") {
    return 404;
  }

  if (error === "You must be signed in to continue.") {
    return 401;
  }

  return 400;
}
