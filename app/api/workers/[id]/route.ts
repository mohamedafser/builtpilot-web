import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { updateWorker } from "@/lib/workers/mutations";
import { getWorkerById } from "@/lib/workers/queries";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function mutationStatus(error: string, status?: number) {
  if (status) {
    return status;
  }

  if (error === "Worker not found.") {
    return 404;
  }

  if (error === "You must be signed in to continue.") {
    return 401;
  }

  return 400;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id } = await context.params;
  const result = await getWorkerById(id);

  if (result.error === "not_found") {
    return apiError("Worker not found.", 404);
  }

  if (!result.worker) {
    return apiError(result.error, 400);
  }

  return apiSuccess("Worker loaded.", { worker: result.worker });
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

  const result = await updateWorker(id, values);

  if ("error" in result) {
    return apiError(result.error, mutationStatus(result.error, result.status));
  }

  revalidatePath("/workers");
  revalidatePath(`/workers/${id}`);
  revalidatePath(`/workers/${id}/edit`);
  return apiSuccess("Worker updated.", { id: result.id });
}
