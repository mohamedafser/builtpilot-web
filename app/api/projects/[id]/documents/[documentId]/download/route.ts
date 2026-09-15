import { apiError } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string; documentId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id, documentId } = await context.params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("project_documents")
    .select("*")
    .eq("id", documentId)
    .eq("project_id", id)
    .eq("business_id", workspace.business.id)
    .maybeSingle();

  if (error || !data) {
    return apiError("Document not found.", 404);
  }

  const { data: file, error: fileError } = await supabase.storage
    .from("project-documents")
    .download(data.storage_path);

  if (fileError || !file) {
    return apiError("Document could not be downloaded.", 400);
  }

  const response = new Response(file, {
    headers: {
      "Content-Type": data.mime_type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${data.file_name}"`,
    },
  });

  return response;
}
