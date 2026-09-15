import { getProjectById } from "@/lib/projects/queries";
import {
  emptyToNull,
  getMaterialErrorMessage,
  isUuid,
  type MaterialMutationResult,
} from "@/lib/materials/helpers";
import { getMaterialById } from "@/lib/materials/queries";
import { createReceiveMaterialAction } from "@/lib/project-actions/workflows";
import { createClient } from "@/lib/supabase/server";
import {
  addProjectMaterialSchema,
  assignMaterialToProjectsSchema,
} from "@/lib/validations/material";
import { getZodErrorMessage } from "@/lib/validations/error";
import type { MaterialUnit } from "@/types";

export async function addMaterialToProject(
  projectId: string,
  values: unknown,
): Promise<MaterialMutationResult> {
  if (!isUuid(projectId)) {
    return { error: "Project not found.", status: 404 };
  }

  const parsed = addProjectMaterialSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Select a valid material."),
    };
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
  const { data: material, error: materialError } = await supabase
    .from("materials")
    .select("id, business_id, status, name, unit")
    .eq("id", parsed.data.material_id)
    .eq("business_id", projectResult.project.business_id)
    .maybeSingle();

  if (materialError) {
    return { error: getMaterialErrorMessage(materialError) };
  }

  if (!material) {
    return { error: "Material not found.", status: 404 };
  }

  if (material.status !== "active") {
    return {
      error: "Inactive materials cannot be added to a project.",
      status: 400,
    };
  }

  const plannedQuantity = emptyToNull(parsed.data.planned_quantity);
  const { data, error } = await supabase
    .from("project_materials")
    .insert({
      business_id: projectResult.project.business_id,
      project_id: projectId,
      material_id: material.id,
      planned_quantity: plannedQuantity,
      minimum_stock: emptyToNull(parsed.data.minimum_stock),
    })
    .select("id")
    .single();

  if (error) {
    return { error: getMaterialErrorMessage(error) };
  }

  void createReceiveMaterialAction({
    businessId: projectResult.project.business_id,
    projectId,
    projectMaterialId: data.id,
    materialId: material.id,
    materialName: material.name,
    unit: material.unit as MaterialUnit,
    plannedQuantity,
  });

  return { success: true, id: data.id };
}

export async function ensureProjectMaterial(
  projectId: string,
  materialId: string,
  businessId: string,
): Promise<{ error: string; status?: number } | { success: true }> {
  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("project_materials")
    .select("id")
    .eq("project_id", projectId)
    .eq("material_id", materialId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (existingError) {
    return { error: getMaterialErrorMessage(existingError) };
  }

  if (existing) {
    return { success: true };
  }

  const { error } = await supabase.from("project_materials").insert({
    business_id: businessId,
    project_id: projectId,
    material_id: materialId,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: true };
    }

    return { error: getMaterialErrorMessage(error) };
  }

  return { success: true };
}

export async function assignMaterialToProjects(
  materialId: string,
  values: unknown,
): Promise<MaterialMutationResult> {
  if (!isUuid(materialId)) {
    return { error: "Material not found.", status: 404 };
  }

  const parsed = assignMaterialToProjectsSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Select at least one project."),
    };
  }

  const materialResult = await getMaterialById(materialId);

  if (materialResult.error === "not_found" || !materialResult.material) {
    return {
      error:
        materialResult.error === "not_found"
          ? "Material not found."
          : materialResult.error,
      status: materialResult.error === "not_found" ? 404 : 400,
    };
  }

  if (materialResult.material.status !== "active") {
    return {
      error: "Inactive materials cannot be assigned to a project.",
      status: 400,
    };
  }

  const uniqueProjectIds = [...new Set(parsed.data.project_ids)];
  const alreadyAssigned = new Set(
    materialResult.material.project_usage.map((row) => row.project_id),
  );
  const assignedIds: string[] = [];

  for (const projectId of uniqueProjectIds) {
    if (alreadyAssigned.has(projectId)) {
      continue;
    }

    const result = await addMaterialToProject(projectId, {
      material_id: materialId,
    });

    if ("error" in result) {
      if (result.error === "This material is already added to the project.") {
        continue;
      }

      return result;
    }

    assignedIds.push(projectId);
  }

  if (assignedIds.length === 0) {
    return {
      error: "This material is already assigned to the selected projects.",
      status: 409,
    };
  }

  return { success: true, ids: assignedIds };
}
