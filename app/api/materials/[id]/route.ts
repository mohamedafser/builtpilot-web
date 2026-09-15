import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import {
  patchMaterialCatalog,
  updateMaterial,
} from "@/lib/materials/mutations";
import { getMaterialById } from "@/lib/materials/queries";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function mutationStatus(error: string, status?: number) {
  if (status) {
    return status;
  }

  if (error === "Material not found.") {
    return 404;
  }

  if (error === "You must be signed in to continue.") {
    return 401;
  }

  return 400;
}

function isPartialCatalogPatch(values: unknown): boolean {
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return false;
  }

  const keys = Object.keys(values);
  if (keys.length === 0) {
    return false;
  }

  const allowed = new Set([
    "default_unit_price",
    "minimum_stock",
    "vendor_id",
  ]);

  return keys.every((key) => allowed.has(key));
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id } = await context.params;
  const result = await getMaterialById(id);

  if (result.error === "not_found") {
    return apiError("Material not found.", 404);
  }

  if (!result.material) {
    return apiError(result.error, 400);
  }

  return apiSuccess("Material loaded.", { material: result.material });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id } = await context.params;
  let values: unknown;

  try {
    values = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const result = isPartialCatalogPatch(values)
    ? await patchMaterialCatalog(id, values)
    : await updateMaterial(id, values);

  if ("error" in result) {
    return apiError(result.error, mutationStatus(result.error, result.status));
  }

  revalidatePath("/materials");
  revalidatePath(`/materials/${id}`);
  revalidatePath(`/materials/${id}/edit`);
  return apiSuccess("Material updated.", { id: result.id });
}
