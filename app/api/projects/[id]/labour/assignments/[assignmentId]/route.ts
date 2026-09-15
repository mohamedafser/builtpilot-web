import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { removeWorkerFromProject } from "@/lib/labour/mutations";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string; assignmentId: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id, assignmentId } = await context.params;
  const result = await removeWorkerFromProject(id, assignmentId);

  if ("error" in result) {
    const status =
      result.status ??
      (result.error === "Project not found." ||
      result.error === "Assignment not found."
        ? 404
        : result.error === "You must be signed in to continue."
          ? 401
          : 400);
    return apiError(result.error, status);
  }

  revalidatePath(`/projects/${id}`);
  revalidatePath(`/projects/${id}/labour`);
  revalidatePath(`/projects/${id}/labour/attendance`);
  revalidatePath("/workers");
  return apiSuccess("Worker removed from project.", { id: result.id });
}
