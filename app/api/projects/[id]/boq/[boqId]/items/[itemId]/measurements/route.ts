import { parsePagination } from "@/lib/api/pagination";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { boqMutationStatus, revalidateBoqPaths } from "@/lib/boq/helpers";
import { createBoqMeasurement } from "@/lib/boq/mutations";
import { getBoqMeasurements } from "@/lib/boq/queries";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string; boqId: string; itemId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id, boqId, itemId } = await context.params;
  const { searchParams } = request.nextUrl;
  const result = await getBoqMeasurements(
    id,
    boqId,
    itemId,
    parsePagination({
      page: searchParams.get("page"),
      page_size: searchParams.get("page_size"),
    }),
  );

  if (result.error === "not_found") {
    return apiError("BOQ item not found.", 404);
  }

  if (result.error || !result.result) {
    return apiError(result.error ?? "Unable to load measurements.", 500);
  }

  return apiSuccess("Measurements loaded.", result.result);
}

export async function POST(request: NextRequest, context: RouteContext) {
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

  const result = await createBoqMeasurement(id, boqId, itemId, values);

  if ("error" in result) {
    return apiError(result.error, boqMutationStatus(result.error, result.status));
  }

  revalidateBoqPaths(id, boqId);
  return apiSuccess("Measurement saved.", { id: result.id }, 201);
}
