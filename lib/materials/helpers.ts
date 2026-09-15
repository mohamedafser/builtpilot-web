import { isMissingSchemaError } from "@/lib/auth/errors";
import {
  emptyToNull,
  isProjectUuid,
  sanitizeSearchTerm,
} from "@/lib/projects/helpers";

export type MaterialMutationResult =
  | { error: string; status?: number }
  | { success: true; id?: string; ids?: string[] };

export const isUuid = isProjectUuid;

export { emptyToNull, sanitizeSearchTerm };

export function getMaterialErrorMessage(error: {
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
    message.includes("project_materials_unique_assignment")
  ) {
    return "This material is already added to the project.";
  }

  if (message.includes("cannot move a material")) {
    return "Materials cannot be moved to another business.";
  }

  if (message.includes("cannot change project material")) {
    return "Project material assignment cannot be moved to another project or business.";
  }

  if (message.includes("cannot change material transaction")) {
    return "Material transaction project, material, and business cannot be changed.";
  }

  if (message.includes("materials_name_present")) {
    return "Material name must be at least 2 characters.";
  }

  if (message.includes("materials_default_unit_price_non_negative")) {
    return "Default unit price must be 0 or greater.";
  }

  if (message.includes("materials_minimum_stock_non_negative")) {
    return "Minimum stock must be 0 or greater.";
  }

  if (message.includes("material vendor must belong")) {
    return "The selected vendor does not belong to this workspace.";
  }

  if (message.includes("material_transactions_vendor_received")) {
    return "Vendors can only be recorded on receive and usage transactions.";
  }

  if (message.includes("material_transactions_quantity_positive")) {
    return "Quantity must be greater than 0.";
  }

  if (message.includes("material_transactions_adjustment_reason")) {
    return "Enter a reason for this adjustment.";
  }

  if (
    message.includes("materials.vendor_id") ||
    message.includes("materials_vendor_id")
  ) {
    return "Material vendor support is missing. Run supabase/migrations/20240913140000_material_default_vendor.sql.";
  }

  if (
    message.includes("materials") ||
    message.includes("project_materials") ||
    message.includes("material_transactions") ||
    message.includes("material_stock_balances")
  ) {
    return "Material tables are missing in the database. Run supabase/migrations/20240912180000_materials_vendors.sql.";
  }

  if (code === "42501") {
    return "You do not have permission to complete this action.";
  }

  return "Unable to complete this action. Please try again.";
}
