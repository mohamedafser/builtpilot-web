import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import {
  enableClientPortal,
  updateClientPortal,
} from "@/lib/client-portal/mutations";
import { getContractorClientPortal } from "@/lib/client-portal/queries";
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
  const result = await getContractorClientPortal(id);

  if (result.error === "not_found") {
    return apiError("Project not found.", 404);
  }

  if (!result.state) {
    return apiError(result.error, 400);
  }

  return apiSuccess("Client portal loaded.", result.state);
}

export async function POST(request: NextRequest, context: RouteContext) {
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

  const result = await enableClientPortal(id, values);

  if ("error" in result) {
    return apiError(result.error, result.status ?? 400);
  }

  revalidatePath(`/projects/${id}`);
  revalidatePath(`/projects/${id}/client-portal`);
  return apiSuccess("Client portal enabled.", {
    token: result.token ?? null,
  });
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

  const result = await updateClientPortal(id, values);

  if ("error" in result) {
    return apiError(result.error, result.status ?? 400);
  }

  revalidatePath(`/projects/${id}`);
  revalidatePath(`/projects/${id}/client-portal`);
  revalidatePath(`/client/preview/${id}`);
  return apiSuccess("Client portal settings saved.", { id });
}
