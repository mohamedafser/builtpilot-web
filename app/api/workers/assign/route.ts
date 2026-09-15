import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { assignWorkersToProjects } from "@/lib/labour/mutations";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  let values: unknown;

  try {
    values = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const result = await assignWorkersToProjects(values);

  if ("error" in result) {
    const status =
      result.status ??
      (result.error === "You must be signed in to continue." ? 401 : 400);
    return apiError(result.error, status);
  }

  const workerIds = Array.isArray(
    (values as { worker_ids?: unknown }).worker_ids,
  )
    ? (values as { worker_ids: unknown[] }).worker_ids.filter(
        (id): id is string => typeof id === "string",
      )
    : [];

  revalidatePath("/workers");
  for (const workerId of workerIds) {
    revalidatePath(`/workers/${workerId}`);
  }
  for (const projectId of result.ids ?? []) {
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/labour`);
    revalidatePath(`/projects/${projectId}/labour/attendance`);
  }

  return apiSuccess("Workers assigned to projects.", { ids: result.ids });
}
