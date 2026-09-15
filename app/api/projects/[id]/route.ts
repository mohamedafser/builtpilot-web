import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { updateProject } from "@/lib/projects/mutations";
import { getProjectById } from "@/lib/projects/queries";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id } = await context.params;
  const result = await getProjectById(id);

  if (result.error === "not_found") {
    return apiError("Project not found.", 404);
  }

  if (!result.project) {
    return apiError(result.error, 400);
  }

  return apiSuccess("Project loaded.", { project: result.project });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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

  const result = await updateProject(id, values);

  if ("error" in result) {
    const status =
      result.error === "Project not found."
        ? 404
        : result.error === "You must be signed in to continue."
          ? 401
          : 400;
    return apiError(result.error, status);
  }

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  return apiSuccess("Project updated.", { id: result.id });
}
