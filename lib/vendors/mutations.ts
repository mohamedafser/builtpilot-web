import { getProjectById, getWorkspaceScope } from "@/lib/projects/queries";
import { getVendorById } from "@/lib/vendors/queries";
import {
  emptyToNull,
  getVendorErrorMessage,
  isUuid,
  type VendorMutationResult,
} from "@/lib/vendors/helpers";
import { createClient } from "@/lib/supabase/server";
import {
  assignVendorToProjectsSchema,
  createVendorSchema,
  updateVendorSchema,
  type CreateVendorFormValues,
} from "@/lib/validations/vendor";
import { getZodErrorMessage } from "@/lib/validations/error";

function vendorWritePayload(values: CreateVendorFormValues) {
  return {
    name: values.name,
    contact_person: emptyToNull(values.contact_person),
    phone: emptyToNull(values.phone),
    email: emptyToNull(values.email),
    address: emptyToNull(values.address),
    notes: emptyToNull(values.notes),
  };
}

export async function createVendor(
  values: unknown,
): Promise<VendorMutationResult> {
  const parsed = createVendorSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Invalid vendor details."),
    };
  }

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { error: scope.message, status: 401 };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .insert({
      business_id: scope.business.id,
      status: "active",
      ...vendorWritePayload(parsed.data),
    })
    .select("id")
    .single();

  if (error) {
    return { error: getVendorErrorMessage(error) };
  }

  return { success: true, id: data.id };
}

export async function updateVendor(
  id: string,
  values: unknown,
): Promise<VendorMutationResult> {
  if (!isUuid(id)) {
    return { error: "Vendor not found.", status: 404 };
  }

  const parsed = updateVendorSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Invalid vendor details."),
    };
  }

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { error: scope.message, status: 401 };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .update({
      ...vendorWritePayload(parsed.data),
      status: parsed.data.status,
    })
    .eq("id", id)
    .eq("business_id", scope.business.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getVendorErrorMessage(error) };
  }

  if (!data) {
    return { error: "Vendor not found.", status: 404 };
  }

  return { success: true, id: data.id };
}

export async function deactivateVendor(
  id: string,
): Promise<VendorMutationResult> {
  return setVendorStatus(id, "inactive");
}

export async function reactivateVendor(
  id: string,
): Promise<VendorMutationResult> {
  return setVendorStatus(id, "active");
}

async function setVendorStatus(
  id: string,
  status: "active" | "inactive",
): Promise<VendorMutationResult> {
  if (!isUuid(id)) {
    return { error: "Vendor not found.", status: 404 };
  }

  const existing = await getVendorById(id);

  if (existing.error === "not_found" || !existing.vendor) {
    return {
      error:
        existing.error === "not_found"
          ? "Vendor not found."
          : (existing.error ?? "Vendor not found."),
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .update({ status })
    .eq("id", id)
    .eq("business_id", existing.vendor.business_id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getVendorErrorMessage(error) };
  }

  if (!data) {
    return { error: "Vendor not found.", status: 404 };
  }

  return { success: true, id: data.id };
}

export async function addVendorToProject(
  projectId: string,
  vendorId: string,
): Promise<VendorMutationResult> {
  if (!isUuid(projectId)) {
    return { error: "Project not found.", status: 404 };
  }

  if (!isUuid(vendorId)) {
    return { error: "Vendor not found.", status: 404 };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      error:
        projectResult.error === "not_found"
          ? "Project not found."
          : projectResult.error,
      status: projectResult.error === "not_found" ? 404 : 400,
    };
  }

  const supabase = await createClient();
  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("id, business_id, status")
    .eq("id", vendorId)
    .eq("business_id", projectResult.project.business_id)
    .maybeSingle();

  if (vendorError) {
    return { error: getVendorErrorMessage(vendorError) };
  }

  if (!vendor) {
    return { error: "Vendor not found.", status: 404 };
  }

  if (vendor.status !== "active") {
    return {
      error: "Inactive vendors cannot be assigned to a project.",
      status: 400,
    };
  }

  const { data, error } = await supabase
    .from("project_vendors")
    .insert({
      business_id: projectResult.project.business_id,
      project_id: projectId,
      vendor_id: vendor.id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: getVendorErrorMessage(error) };
  }

  return { success: true, id: data.id };
}

export async function assignVendorToProjects(
  vendorId: string,
  values: unknown,
): Promise<VendorMutationResult> {
  if (!isUuid(vendorId)) {
    return { error: "Vendor not found.", status: 404 };
  }

  const parsed = assignVendorToProjectsSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Select at least one project."),
    };
  }

  const vendorResult = await getVendorById(vendorId);

  if (vendorResult.error === "not_found" || !vendorResult.vendor) {
    return {
      error:
        vendorResult.error === "not_found"
          ? "Vendor not found."
          : vendorResult.error,
      status: vendorResult.error === "not_found" ? 404 : 400,
    };
  }

  if (vendorResult.vendor.status !== "active") {
    return {
      error: "Inactive vendors cannot be assigned to a project.",
      status: 400,
    };
  }

  const uniqueProjectIds = [...new Set(parsed.data.project_ids)];
  const alreadyAssigned = new Set(
    vendorResult.vendor.projects_supplied.map((row) => row.project_id),
  );
  const assignedIds: string[] = [];

  for (const projectId of uniqueProjectIds) {
    if (alreadyAssigned.has(projectId)) {
      continue;
    }

    const result = await addVendorToProject(projectId, vendorId);

    if ("error" in result) {
      if (result.error === "This vendor is already assigned to the project.") {
        continue;
      }

      return result;
    }

    assignedIds.push(projectId);
  }

  if (assignedIds.length === 0) {
    return {
      error: "This vendor is already assigned to the selected projects.",
      status: 409,
    };
  }

  return { success: true, ids: assignedIds };
}
