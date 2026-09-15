import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { getAssignableProjects } from "@/lib/workers/queries";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const search = request.nextUrl.searchParams.get("q") ?? undefined;
  const result = await getAssignableProjects(search);

  if (result.error) {
    return apiError(result.error, 400);
  }

  return apiSuccess("Assignable projects loaded.", {
    projects: result.projects,
  });
}
