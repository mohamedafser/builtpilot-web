import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import {
  listProjectDocuments,
  uploadProjectDocument,
} from "@/lib/projects/documents";
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
  const result = await listProjectDocuments(id);

  if (result.error) {
    const status = result.error === "Project not found." ? 404 : 400;
    return apiError(result.error, status);
  }

  return apiSuccess("Project documents loaded.", {
    documents: result.documents,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id } = await context.params;
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return apiError("Invalid upload. Please try again.", 400);
  }

  const fileValue = formData.get("file");
  const notesValue = formData.get("notes");

  if (!(fileValue instanceof File)) {
    return apiError("Choose a document to upload.");
  }

  const notes = typeof notesValue === "string" ? notesValue : undefined;
  const result = await uploadProjectDocument(id, fileValue, notes);

  if ("error" in result) {
    const status =
      result.status ?? (result.error === "Project not found." ? 404 : 400);
    return apiError(result.error, status);
  }

  revalidatePath(`/projects/${id}`);
  revalidatePath(`/projects/${id}/documents`);
  return apiSuccess("Document uploaded.", { document: result.document }, 201);
}
