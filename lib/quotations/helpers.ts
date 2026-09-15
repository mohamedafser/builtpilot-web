import { revalidatePath } from "next/cache";
import { isMissingSchemaError } from "@/lib/auth/errors";
import { emptyToNull, sanitizeSearchTerm } from "@/lib/daily-reports/helpers";
import { isProjectUuid } from "@/lib/projects/helpers";

export type QuotationMutationResult =
  | { error: string; status?: number }
  | { success: true; id: string; emailedTo?: string };

export function quotationSavedMessage(
  result: Extract<QuotationMutationResult, { success: true }>,
  submitAction: unknown,
  draftMessage: string,
) {
  if (result.emailedTo) {
    return `Quotation emailed to ${result.emailedTo}.`;
  }

  if (submitAction === "send") {
    return "Quotation marked as sent.";
  }

  return draftMessage;
}

export const isUuid = isProjectUuid;

export { emptyToNull, sanitizeSearchTerm };

export function getQuotationErrorMessage(error: {
  message: string;
  code?: string;
}): string {
  if (isMissingSchemaError(error)) {
    return "The database schema is not fully set up. Run the latest Supabase migration.";
  }

  const message = error.message.toLowerCase();
  const code = error.code ?? "";

  if (message.includes("quotations_number_unique")) {
    return "A quotation with this number already exists. Please try again.";
  }

  if (message.includes("not authorized to generate a quotation number")) {
    return "You do not have permission to create a quotation.";
  }

  if (message.includes("quotation project must belong")) {
    return "That project does not belong to this workspace.";
  }

  if (message.includes("quotation material must belong")) {
    return "That material does not belong to this workspace.";
  }

  if (message.includes("quotation item must belong")) {
    return "That quotation does not belong to this workspace.";
  }

  if (message.includes("cannot change quotation business")) {
    return "Quotation business, creator, and number cannot be changed.";
  }

  if (message.includes("cannot change a linked quotation project")) {
    return "This quotation is already linked to a project.";
  }

  if (message.includes("accepted quotations cannot")) {
    return "Accepted quotations cannot be edited. Duplicate it to make changes.";
  }

  if (message.includes("only draft quotations can change items")) {
    return "Only draft quotations can change items.";
  }

  if (message.includes("invalid quotation status change")) {
    return "That status change is not allowed.";
  }

  if (message.includes("quotations_validity_ordered")) {
    return "Valid until must be on or after the quotation date.";
  }

  if (message.includes("quotation_items_quantity_positive")) {
    return "Quantity must be greater than 0.";
  }

  if (message.includes("quotation_items_material_required")) {
    return "Material items must use a catalog material.";
  }

  if (message.includes("quotation worker must belong")) {
    return "That worker does not belong to this workspace.";
  }

  if (message.includes("quotation_items_worker_required")) {
    return "Labour items must use a worker from this workspace.";
  }

  if (message.includes("quotations_discount_not_over_subtotal")) {
    return "Discount cannot be greater than the subtotal.";
  }

  if (message.includes("quotations") || message.includes("quotation_items")) {
    return "Quotation tables are missing in the database. Run supabase/migrations/20240913180000_quotations.sql.";
  }

  if (code === "42501") {
    return "You do not have permission to complete this action.";
  }

  if (code === "23505") {
    return "A quotation with this number already exists. Please try again.";
  }

  return "Unable to complete this action. Please try again.";
}

export function revalidateQuotationPaths(
  quotationId?: string,
  projectId?: string | null,
) {
  revalidatePath("/dashboard");
  revalidatePath("/quotations");
  revalidatePath("/quotations/new");
  revalidatePath("/projects");

  if (quotationId) {
    revalidatePath(`/quotations/${quotationId}`);
    revalidatePath(`/quotations/${quotationId}/edit`);
  }

  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/quotations`);
    revalidatePath(`/projects/${projectId}/quotations/new`);
  }
}

export function quotationMutationStatus(error: string, status?: number) {
  if (status) {
    return status;
  }

  if (
    error === "Project not found." ||
    error === "Quotation not found." ||
    error === "Material not found."
  ) {
    return 404;
  }

  if (error === "You must be signed in to continue.") {
    return 401;
  }

  return 400;
}
