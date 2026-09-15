import { isMissingSchemaError } from "@/lib/auth/errors";
import {
  emptyToNull,
  isProjectUuid,
  sanitizeSearchTerm,
} from "@/lib/projects/helpers";

export type VendorMutationResult =
  | { error: string; status?: number }
  | { success: true; id?: string; ids?: string[] };

export const isUuid = isProjectUuid;

export { emptyToNull, sanitizeSearchTerm };

export function getVendorErrorMessage(error: {
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
    message.includes("project_vendors_unique_assignment")
  ) {
    return "This vendor is already assigned to the project.";
  }

  if (message.includes("cannot move a vendor")) {
    return "Vendors cannot be moved to another business.";
  }

  if (message.includes("cannot change project vendor")) {
    return "Vendor project assignment cannot be moved to another project or business.";
  }

  if (message.includes("vendors_name_present")) {
    return "Vendor name must be at least 2 characters.";
  }

  if (message.includes("project_vendors")) {
    return "Vendor project assignments are missing. Run supabase/migrations/20240913100000_project_vendors.sql.";
  }

  if (message.includes("vendors")) {
    return "Vendor tables are missing in the database. Run supabase/migrations/20240912180000_materials_vendors.sql.";
  }

  if (code === "42501") {
    return "You do not have permission to complete this action.";
  }

  return "Unable to complete this action. Please try again.";
}
