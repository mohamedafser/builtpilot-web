import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { getAvailableProjectsForWorker } from "@/lib/workers/queries";
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
  const search = request.nextUrl.searchParams.get("q") ?? undefined;
  const result = await getAvailableProjectsForWorker(id, search);

  if (result.error === "not_found") {
    return apiError("Worker not found.", 404);
  }

  if (result.error) {
    return apiError(result.error, 400);
  }

  return apiSuccess("Available projects loaded.", {
    projects: result.projects,
  });
}
