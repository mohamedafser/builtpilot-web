import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getProjectById } from "@/lib/projects/queries";
import { sanitizeFileName } from "@/lib/expenses/helpers";

export type ProjectDocument = {
  id: string;
  project_id: string;
  business_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  notes: string | null;
  created_at: string;
  updated_at?: string | null;
};

export const PROJECT_DOCUMENT_BUCKET = "project-documents";

export function makeProjectDocumentStoragePath(
  businessId: string,
  projectId: string,
  fileName: string,
) {
  return `business/${businessId}/projects/${projectId}/documents/${sanitizeFileName(fileName)}`;
}

export type ProjectDocumentMutationResult =
  | { error: string; status?: number }
  | { success: true; document: ProjectDocument };

export async function listProjectDocuments(
  projectId: string,
): Promise<{ documents: ProjectDocument[]; error: string | null }> {
  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      documents: [],
      error:
        projectResult.error === "not_found"
          ? "Project not found."
          : projectResult.error,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_documents")
    .select("*")
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      documents: [],
      error: error.message || "Unable to load project documents.",
    };
  }

  return { documents: data ?? [], error: null };
}

export async function uploadProjectDocument(
  projectId: string,
  file: File,
  notes?: string,
): Promise<ProjectDocumentMutationResult> {
  if (!projectId || !(file instanceof File) || file.size === 0) {
    return { error: "Choose a document to upload." };
  }

  if (file.size > 25 * 1024 * 1024) {
    return { error: "That document is too large. Use a file under 25 MB." };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "You must be signed in to continue.", status: 401 };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      error:
        projectResult.error === "not_found"
          ? "Project not found."
          : projectResult.error,
      status: projectResult.error === "not_found" ? 404 : 400,
    };
  }

  const safeName = sanitizeFileName(file.name);
  const storagePath = makeProjectDocumentStoragePath(
    projectResult.project.business_id,
    projectId,
    safeName,
  );

  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from(PROJECT_DOCUMENT_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError) {
    return { error: uploadError.message || "Unable to upload document." };
  }

  const { data, error } = await supabase
    .from("project_documents")
    .insert({
      project_id: projectId,
      business_id: projectResult.project.business_id,
      storage_path: storagePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || "application/octet-stream",
      uploaded_by: user.id,
      notes: notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error || !data) {
    await supabase.storage.from(PROJECT_DOCUMENT_BUCKET).remove([storagePath]);
    return {
      error: error?.message || "Unable to save document details.",
    };
  }

  return { success: true, document: data };
}

export async function deleteProjectDocument(
  projectId: string,
  documentId: string,
): Promise<{ error: string; status?: number } | { success: true }> {
  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      error:
        projectResult.error === "not_found"
          ? "Project not found."
          : projectResult.error,
      status: projectResult.error === "not_found" ? 404 : 400,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_documents")
    .select("*")
    .eq("id", documentId)
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id)
    .maybeSingle();

  if (error) {
    return { error: error.message || "Unable to remove document." };
  }

  if (!data) {
    return { error: "Document not found.", status: 404 };
  }

  const { error: storageError } = await supabase.storage
    .from(PROJECT_DOCUMENT_BUCKET)
    .remove([data.storage_path]);

  if (storageError) {
    return { error: storageError.message || "Unable to remove document." };
  }

  const { error: deleteError } = await supabase
    .from("project_documents")
    .delete()
    .eq("id", documentId)
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id);

  if (deleteError) {
    return { error: deleteError.message || "Unable to remove document." };
  }

  return { success: true };
}
