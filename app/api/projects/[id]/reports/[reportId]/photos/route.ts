import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { uploadReportPhoto } from "@/lib/daily-reports/photos";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string; reportId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id, reportId } = await context.params;
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return apiError("Invalid upload. Please try again.", 400);
  }

  const fileValue = formData.get("file");
  const captionValue = formData.get("caption");

  if (!(fileValue instanceof File)) {
    return apiError("Choose a photo to upload.");
  }

  const caption = typeof captionValue === "string" ? captionValue : undefined;
  const result = await uploadReportPhoto(id, reportId, fileValue, caption);

  if ("error" in result) {
    const status =
      result.status ??
      (result.error === "Daily report not found." ||
      result.error === "Project not found."
        ? 404
        : 400);
    return apiError(result.error, status);
  }

  revalidatePath(`/projects/${id}`);
  revalidatePath(`/projects/${id}/reports`);
  revalidatePath(`/projects/${id}/reports/${reportId}`);
  return apiSuccess("Photo uploaded.", { photo: result.photo }, 201);
}
