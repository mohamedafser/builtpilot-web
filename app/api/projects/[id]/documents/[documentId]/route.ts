import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { deleteProjectDocument } from "@/lib/projects/documents";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string; documentId: string }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id, documentId } = await context.params;
  const result = await deleteProjectDocument(id, documentId);

  if ("error" in result) {
    const status =
      result.status ?? (result.error === "Project not found." ? 404 : 400);
    return apiError(result.error, status);
  }

  revalidatePath(`/projects/${id}`);
  revalidatePath(`/projects/${id}/documents`);
  return apiSuccess("Document removed.", { id: documentId });
}
