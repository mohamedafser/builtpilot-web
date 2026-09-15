import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { getProjectActions } from "@/lib/project-actions/queries";
import { getProjectById } from "@/lib/projects/queries";
import type { ProjectActionStatus } from "@/lib/project-actions/types";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id: projectId } = await context.params;
  const project = await getProjectById(projectId);

  if (project.error === "not_found" || !project.project) {
    return apiError(
      project.error === "not_found" ? "Project not found." : project.error,
      project.error === "not_found" ? 404 : 400,
    );
  }

  const statusParam = request.nextUrl.searchParams.get("status");
  const status: ProjectActionStatus | "all" =
    statusParam === "all" ||
    statusParam === "pending" ||
    statusParam === "completed" ||
    statusParam === "dismissed"
      ? statusParam
      : "pending";

  const { actions, error } = await getProjectActions(projectId, { status });

  if (error) {
    return apiError(error, 500);
  }

  return apiSuccess("Project actions loaded.", {
    actions,
    pendingCount: actions.filter((action) => action.status === "pending")
      .length,
  });
}
