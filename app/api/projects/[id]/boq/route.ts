import { parsePagination } from "@/lib/api/pagination";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import {
  boqMutationStatus,
  revalidateBoqPaths,
} from "@/lib/boq/helpers";
import { createBoq } from "@/lib/boq/mutations";
import { getProjectBoqs, parseBoqSearchParams } from "@/lib/boq/queries";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id } = await context.params;
  const { searchParams } = request.nextUrl;
  const result = await getProjectBoqs(
    id,
    parseBoqSearchParams({
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    }),
    parsePagination({
      page: searchParams.get("page"),
      page_size: searchParams.get("page_size"),
    }),
  );

  if (result.error === "not_found") {
    return apiError("Project not found.", 404);
  }

  if (result.error || !result.result) {
    return apiError(result.error ?? "Unable to load BOQs.", 500);
  }

  return apiSuccess("BOQs loaded.", result.result);
}

export async function POST(request: NextRequest, context: RouteContext) {
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

  const result = await createBoq(id, values);

  if ("error" in result) {
    return apiError(result.error, boqMutationStatus(result.error, result.status));
  }

  revalidateBoqPaths(id, result.id);
  return apiSuccess("BOQ created.", { id: result.id }, 201);
}
