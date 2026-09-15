import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { completeProjectAction } from "@/lib/project-actions/mutations";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ actionId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { actionId } = await context.params;
  let body: { status?: "completed" | "dismissed" } = {};

  try {
    body = (await request.json()) as { status?: "completed" | "dismissed" };
  } catch {
    body = {};
  }

  const status =
    body.status === "dismissed" ? "dismissed" : ("completed" as const);

  const result = await completeProjectAction({
    actionId,
    status,
    userId: workspace.user.id,
  });

  if ("error" in result) {
    return apiError(result.error, result.status ?? 400);
  }

  return apiSuccess(
    status === "dismissed" ? "Action dismissed." : "Action completed.",
    { action: result.action },
  );
}
