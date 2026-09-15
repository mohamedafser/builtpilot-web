import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { boqMutationStatus, revalidateBoqPaths } from "@/lib/boq/helpers";
import { deleteBoqItem, updateBoqItem } from "@/lib/boq/mutations";
import { getBoqItemById } from "@/lib/boq/queries";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string; boqId: string; itemId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id, boqId, itemId } = await context.params;
  const result = await getBoqItemById(id, boqId, itemId);

  if (result.error === "not_found") {
    return apiError("BOQ item not found.", 404);
  }

  if (result.error || !result.result) {
    return apiError(result.error ?? "Unable to load this item.", 500);
  }

  return apiSuccess("BOQ item loaded.", result.result);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id, boqId, itemId } = await context.params;
  let values: unknown;

  try {
    values = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const result = await updateBoqItem(id, boqId, itemId, values);

  if ("error" in result) {
    return apiError(result.error, boqMutationStatus(result.error, result.status));
  }

  revalidateBoqPaths(id, boqId);
  return apiSuccess("Item updated.", { id: result.id });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id, boqId, itemId } = await context.params;
  const result = await deleteBoqItem(id, boqId, itemId);

  if ("error" in result) {
    return apiError(result.error, boqMutationStatus(result.error, result.status));
  }

  revalidateBoqPaths(id, boqId);
  return apiSuccess("Item deleted.", { id: result.id });
}
