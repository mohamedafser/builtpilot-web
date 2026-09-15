import { revalidatePath } from "next/cache";
import { isMissingSchemaError } from "@/lib/auth/errors";
import { emptyToNull, sanitizeSearchTerm } from "@/lib/daily-reports/helpers";
import { isProjectUuid } from "@/lib/projects/helpers";

export type BoqMutationResult =
  | { error: string; status?: number }
  | { success: true; id: string };

export const isUuid = isProjectUuid;

export { emptyToNull, sanitizeSearchTerm };

export function getBoqErrorMessage(error: {
  message: string;
  code?: string;
}): string {
  if (isMissingSchemaError(error)) {
    return "The database schema is not fully set up. Run the latest Supabase migration.";
  }

  const message = error.message;
  const lower = message.toLowerCase();
  const code = error.code ?? "";

  if (lower.includes("measurement exceeds remaining quantity")) {
    const remaining = message.match(/Remaining quantity:\s*([0-9.]+)/i)?.[1];
    return remaining
      ? `Measurement exceeds remaining quantity. Remaining quantity: ${remaining}.`
      : "Measurement exceeds remaining quantity.";
  }

  if (lower.includes("cannot change boq business")) {
    return "BOQ business, project, and creator cannot be changed.";
  }

  if (lower.includes("invalid boq status change")) {
    return "That status change is not allowed.";
  }

  if (lower.includes("archived boqs cannot change status")) {
    return "Archived BOQs cannot be changed.";
  }

  if (lower.includes("boq project must belong")) {
    return "That project does not belong to this workspace.";
  }

  if (lower.includes("boq section must belong")) {
    return "That section does not belong to this BOQ.";
  }

  if (lower.includes("boq item must belong")) {
    return "That item does not belong to this BOQ.";
  }

  if (lower.includes("boq material must belong")) {
    return "That material does not belong to this workspace.";
  }

  if (lower.includes("only draft or active boqs can change sections")) {
    return "Only draft or active BOQs can change sections.";
  }

  if (lower.includes("only draft or active boqs can change items")) {
    return "Only draft or active BOQs can change items.";
  }

  if (lower.includes("cannot delete a section that still has")) {
    return "Remove or move the items in this section before deleting it.";
  }

  if (lower.includes("cannot delete a boq item that has measurement")) {
    return "This item has measurement history and cannot be deleted.";
  }

  if (lower.includes("cannot change the unit of a boq item")) {
    return "This item has measurements, so its unit cannot be changed.";
  }

  if (lower.includes("estimated quantity cannot be less than completed")) {
    return "Estimated quantity cannot be less than the completed quantity.";
  }

  if (lower.includes("measurement must belong")) {
    return "That measurement does not belong to this BOQ item.";
  }

  if (lower.includes("measurement unit must match")) {
    return "Measurement unit must match the BOQ item unit.";
  }

  if (lower.includes("measurements can only be added")) {
    return "Measurements can only be added to draft or active BOQs.";
  }

  if (lower.includes("new measurements must be active")) {
    return "New measurements must be active.";
  }

  if (lower.includes("voided measurements cannot")) {
    return "Voided measurements cannot be changed.";
  }

  if (lower.includes("cannot change measurement scope")) {
    return "Measurement project, BOQ, item, and author cannot be changed.";
  }

  if (lower.includes("measurements cannot be edited")) {
    return "Measurements cannot be edited. Void this record and add a corrected measurement.";
  }

  if (lower.includes("measurements cannot be deleted")) {
    return "Measurements cannot be deleted. Void the record instead.";
  }

  if (lower.includes("boq_items_estimated_quantity_positive")) {
    return "Estimated quantity must be greater than 0.";
  }

  if (lower.includes("boq_items_rate_non_negative")) {
    return "Rate must be 0 or greater.";
  }

  if (lower.includes("boq_measurements_quantity_positive")) {
    return "Quantity must be greater than 0.";
  }

  if (lower.includes("boq_items_completed_not_over_estimated")) {
    return "Completed quantity cannot exceed estimated quantity.";
  }

  if (
    lower.includes("boqs") ||
    lower.includes("boq_sections") ||
    lower.includes("boq_items") ||
    lower.includes("boq_measurements")
  ) {
    return "BOQ tables are missing in the database. Run supabase/migrations/20240913200000_boq_measurements.sql.";
  }

  if (code === "42501") {
    return "You do not have permission to complete this action.";
  }

  return "Unable to complete this action. Please try again.";
}

export function revalidateBoqPaths(projectId: string, boqId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/boq`);
  revalidatePath(`/projects/${projectId}/boq/new`);

  if (boqId) {
    revalidatePath(`/projects/${projectId}/boq/${boqId}`);
    revalidatePath(`/projects/${projectId}/boq/${boqId}/edit`);
  }
}

export function boqMutationStatus(error: string, status?: number) {
  if (status) {
    return status;
  }

  if (
    error === "Project not found." ||
    error === "BOQ not found." ||
    error === "Section not found." ||
    error === "BOQ item not found." ||
    error === "Measurement not found." ||
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
