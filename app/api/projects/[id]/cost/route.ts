import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { getProjectCostDashboard } from "@/lib/costs/queries";
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
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const result = await getProjectCostDashboard(id, { from, to });

  if (result.error === "not_found") {
    return apiError("Project not found.", 404);
  }

  if (result.error || !result.dashboard) {
    return apiError(result.error ?? "Unable to load project cost.", 400);
  }

  return apiSuccess("Project cost loaded.", result.dashboard);
}
