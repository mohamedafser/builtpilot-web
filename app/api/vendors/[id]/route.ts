import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { updateVendor } from "@/lib/vendors/mutations";
import { getVendorById } from "@/lib/vendors/queries";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function mutationStatus(error: string, status?: number) {
  if (status) {
    return status;
  }

  if (error === "Vendor not found.") {
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
  const result = await getVendorById(id);

  if (result.error === "not_found") {
    return apiError("Vendor not found.", 404);
  }

  if (!result.vendor) {
    return apiError(result.error, 400);
  }

  return apiSuccess("Vendor loaded.", { vendor: result.vendor });
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

  const result = await updateVendor(id, values);

  if ("error" in result) {
    return apiError(result.error, mutationStatus(result.error, result.status));
  }

  revalidatePath("/vendors");
  revalidatePath(`/vendors/${id}`);
  revalidatePath(`/vendors/${id}/edit`);
  return apiSuccess("Vendor updated.", { id: result.id });
}
