import { getWorkspaceScope } from "@/lib/projects/queries";
import { getMaterialById } from "@/lib/materials/queries";
import {
  emptyToNull,
  getMaterialErrorMessage,
  isUuid,
  type MaterialMutationResult,
} from "@/lib/materials/helpers";
import { createClient } from "@/lib/supabase/server";
import {
  createMaterialSchema,
  patchMaterialCatalogSchema,
  updateMaterialSchema,
  type CreateMaterialFormValues,
} from "@/lib/validations/material";
import { getZodErrorMessage } from "@/lib/validations/error";
import { materialToFormValues } from "@/constants/material";
import type { Material } from "@/types";

function materialWritePayload(values: CreateMaterialFormValues) {
  return {
    name: values.name,
    category: values.category,
    unit: values.unit,
    default_unit_price: emptyToNull(values.default_unit_price),
    minimum_stock: emptyToNull(values.minimum_stock),
    vendor_id: emptyToNull(values.vendor_id),
    notes: emptyToNull(values.notes),
  };
}

async function resolveMaterialVendor(
  businessId: string,
  vendorId: string | null,
  options: { allowInactiveId?: string | null } = {},
): Promise<{ error: string; status?: number } | { vendorId: string | null }> {
  if (!vendorId) {
    return { vendorId: null };
  }

  const supabase = await createClient();
  const { data: vendor, error } = await supabase
    .from("vendors")
    .select("id, status")
    .eq("id", vendorId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    return { error: getMaterialErrorMessage(error) };
  }

  if (!vendor) {
    return { error: "Vendor not found.", status: 404 };
  }

  if (vendor.status !== "active" && vendor.id !== options.allowInactiveId) {
    return {
      error: "Inactive vendors cannot be selected for a material.",
      status: 400,
    };
  }

  return { vendorId: vendor.id };
}

export async function createMaterial(
  values: unknown,
): Promise<MaterialMutationResult> {
  const parsed = createMaterialSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Invalid material details."),
    };
  }

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { error: scope.message, status: 401 };
  }

  const supabase = await createClient();
  const vendorResult = await resolveMaterialVendor(
    scope.business.id,
    emptyToNull(parsed.data.vendor_id),
  );

  if ("error" in vendorResult) {
    return vendorResult;
  }

  const { data, error } = await supabase
    .from("materials")
    .insert({
      business_id: scope.business.id,
      status: "active",
      ...materialWritePayload(parsed.data),
      vendor_id: vendorResult.vendorId,
    })
    .select("id")
    .single();

  if (error) {
    return { error: getMaterialErrorMessage(error) };
  }

  return { success: true, id: data.id };
}

export async function updateMaterial(
  id: string,
  values: unknown,
): Promise<MaterialMutationResult> {
  if (!isUuid(id)) {
    return { error: "Material not found.", status: 404 };
  }

  const parsed = updateMaterialSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Invalid material details."),
    };
  }

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { error: scope.message, status: 401 };
  }

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("materials")
    .select("id, vendor_id")
    .eq("id", id)
    .eq("business_id", scope.business.id)
    .maybeSingle();

  if (existingError) {
    return { error: getMaterialErrorMessage(existingError) };
  }

  if (!existing) {
    return { error: "Material not found.", status: 404 };
  }

  const vendorResult = await resolveMaterialVendor(
    scope.business.id,
    emptyToNull(parsed.data.vendor_id),
    { allowInactiveId: existing.vendor_id },
  );

  if ("error" in vendorResult) {
    return vendorResult;
  }

  const { data, error } = await supabase
    .from("materials")
    .update({
      ...materialWritePayload(parsed.data),
      vendor_id: vendorResult.vendorId,
      status: parsed.data.status,
    })
    .eq("id", id)
    .eq("business_id", scope.business.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getMaterialErrorMessage(error) };
  }

  if (!data) {
    return { error: "Material not found.", status: 404 };
  }

  return { success: true, id: data.id };
}

export async function patchMaterialCatalog(
  id: string,
  values: unknown,
): Promise<MaterialMutationResult> {
  if (!isUuid(id)) {
    return { error: "Material not found.", status: 404 };
  }

  const parsed = patchMaterialCatalogSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Invalid material details."),
    };
  }

  const existingResult = await getMaterialById(id);

  if (existingResult.error === "not_found" || !existingResult.material) {
    return {
      error:
        existingResult.error === "not_found"
          ? "Material not found."
          : (existingResult.error ?? "Material not found."),
      status: existingResult.error === "not_found" ? 404 : 400,
    };
  }

  const material = existingResult.material as Material;
  const current = materialToFormValues(material);
  const merged = {
    ...current,
    default_unit_price:
      parsed.data.default_unit_price !== undefined
        ? parsed.data.default_unit_price
        : current.default_unit_price,
    minimum_stock:
      parsed.data.minimum_stock !== undefined
        ? parsed.data.minimum_stock
        : current.minimum_stock,
    vendor_id:
      parsed.data.vendor_id !== undefined
        ? parsed.data.vendor_id
        : current.vendor_id,
  };

  return updateMaterial(id, merged);
}

export async function deactivateMaterial(
  id: string,
): Promise<MaterialMutationResult> {
  return setMaterialStatus(id, "inactive");
}

export async function reactivateMaterial(
  id: string,
): Promise<MaterialMutationResult> {
  return setMaterialStatus(id, "active");
}

async function setMaterialStatus(
  id: string,
  status: "active" | "inactive",
): Promise<MaterialMutationResult> {
  if (!isUuid(id)) {
    return { error: "Material not found.", status: 404 };
  }

  const existing = await getMaterialById(id);

  if (existing.error === "not_found" || !existing.material) {
    return {
      error:
        existing.error === "not_found"
          ? "Material not found."
          : (existing.error ?? "Material not found."),
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials")
    .update({ status })
    .eq("id", id)
    .eq("business_id", existing.material.business_id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getMaterialErrorMessage(error) };
  }

  if (!data) {
    return { error: "Material not found.", status: 404 };
  }

  return { success: true, id: data.id };
}
