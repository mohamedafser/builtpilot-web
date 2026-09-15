import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { updateDailyReport } from "@/lib/daily-reports/mutations";
import { getDailyReport } from "@/lib/daily-reports/queries";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string; reportId: string }>;
};

function revalidatePaths(projectId: string, reportId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/reports`);
  revalidatePath(`/projects/${projectId}/reports/${reportId}`);
  revalidatePath(`/projects/${projectId}/reports/${reportId}/edit`);
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id, reportId } = await context.params;
  const result = await getDailyReport(id, reportId);

  if (result.error === "not_found") {
    return apiError("Daily report not found.", 404);
  }

  if (!result.detail) {
    return apiError(result.error, 400);
  }

  return apiSuccess("Daily report loaded.", result.detail);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id, reportId } = await context.params;
  let values: unknown;

  try {
    values = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const result = await updateDailyReport(id, reportId, values);

  if ("error" in result) {
    const status =
      result.status ??
      (result.error === "Daily report not found." ||
      result.error === "Project not found."
        ? 404
        : result.error === "You must be signed in to continue."
          ? 401
          : 400);
    return apiError(result.error, status);
  }

  revalidatePaths(id, reportId);
  return apiSuccess("Daily report updated.", { id: result.id });
}
