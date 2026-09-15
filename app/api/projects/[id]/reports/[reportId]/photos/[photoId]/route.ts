import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { deleteReportPhoto } from "@/lib/daily-reports/photos";
import { revalidatePath } from "next/cache";

type RouteContext = {
  params: Promise<{ id: string; reportId: string; photoId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id, reportId, photoId } = await context.params;
  const result = await deleteReportPhoto(id, reportId, photoId);

  if ("error" in result) {
    const status =
      result.status ??
      (result.error === "Photo not found." ||
      result.error === "Daily report not found." ||
      result.error === "Project not found."
        ? 404
        : 400);
    return apiError(result.error, status);
  }

  revalidatePath(`/projects/${id}`);
  revalidatePath(`/projects/${id}/reports`);
  revalidatePath(`/projects/${id}/reports/${reportId}`);
  return apiSuccess("Photo deleted.", { id: photoId });
}
