import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { assignVendorToProjects } from "@/lib/vendors/mutations";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

  const result = await assignVendorToProjects(id, values);

  if ("error" in result) {
    const status =
      result.status ??
      (result.error === "Vendor not found."
        ? 404
        : result.error === "You must be signed in to continue."
          ? 401
          : 400);
    return apiError(result.error, status);
  }

  revalidatePath("/vendors");
  revalidatePath(`/vendors/${id}`);
  for (const projectId of result.ids ?? []) {
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/materials`);
  }

  return apiSuccess("Vendor assigned to projects.", { ids: result.ids });
}
