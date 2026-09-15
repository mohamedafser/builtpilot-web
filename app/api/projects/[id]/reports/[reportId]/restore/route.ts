import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { restoreDailyReport } from "@/lib/daily-reports/mutations";
import { revalidatePath } from "next/cache";

type RouteContext = {
  params: Promise<{ id: string; reportId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id, reportId } = await context.params;
  const result = await restoreDailyReport(id, reportId);

  if ("error" in result) {
    const status =
      result.status ??
      (result.error === "Daily report not found." ||
      result.error === "Project not found."
        ? 404
        : 400);
    return apiError(result.error, status);
  }

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  revalidatePath(`/projects/${id}/reports`);
  revalidatePath(`/projects/${id}/reports/${reportId}`);
  return apiSuccess("Daily report restored.", { id: result.id });
}
