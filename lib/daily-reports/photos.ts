import {
  ACCEPTED_SITE_PHOTO_TYPES,
  MAX_SITE_PHOTO_BYTES,
  SITE_PHOTO_BUCKET,
} from "@/constants/daily-report";
import { getCurrentUser } from "@/lib/auth";
import {
  emptyToNull,
  getDailyReportErrorMessage,
  isUuid,
  sanitizeFileName,
} from "@/lib/daily-reports/helpers";
import { getProjectById } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import type { SitePhoto } from "@/types";

const ALLOWED_TYPES = new Set<string>(ACCEPTED_SITE_PHOTO_TYPES);

export type PhotoMutationResult =
  { error: string; status?: number } | { success: true; photo: SitePhoto };

function isAllowedImage(file: File): boolean {
  if (ALLOWED_TYPES.has(file.type.toLowerCase())) {
    return true;
  }

  const name = file.name.toLowerCase();
  return (
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

export async function uploadReportPhoto(
  projectId: string,
  reportId: string,
  file: File,
  caption?: string,
): Promise<PhotoMutationResult> {
  if (!isUuid(projectId) || !isUuid(reportId)) {
    return { error: "Daily report not found.", status: 404 };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }

  if (!isAllowedImage(file)) {
    return {
      error: "That image type is not supported. Use JPEG, PNG, WebP, or HEIC.",
    };
  }

  if (file.size > MAX_SITE_PHOTO_BYTES) {
    return { error: "That photo is too large. Use an image under 10 MB." };
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

  const supabase = await createClient();
  const { data: report, error: reportError } = await supabase
    .from("daily_site_reports")
    .select("id")
    .eq("id", reportId)
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id)
    .maybeSingle();

  if (reportError) {
    return { error: getDailyReportErrorMessage(reportError) };
  }

  if (!report) {
    return { error: "Daily report not found.", status: 404 };
  }

  const photoId = crypto.randomUUID();
  const fileName = sanitizeFileName(file.name);
  const storagePath = `business/${projectResult.project.business_id}/projects/${projectId}/reports/${reportId}/${photoId}-${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(SITE_PHOTO_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });

  if (uploadError) {
    return { error: getDailyReportErrorMessage(uploadError) };
  }

  const { data: photo, error: insertError } = await supabase
    .from("site_photos")
    .insert({
      id: photoId,
      project_id: projectId,
      daily_report_id: reportId,
      business_id: projectResult.project.business_id,
      storage_path: storagePath,
      file_name: fileName,
      file_size: file.size,
      mime_type: file.type || "image/jpeg",
      caption: emptyToNull(caption),
      uploaded_by: user.id,
    })
    .select("*")
    .single();

  if (insertError || !photo) {
    await supabase.storage.from(SITE_PHOTO_BUCKET).remove([storagePath]);
    return {
      error: insertError
        ? getDailyReportErrorMessage(insertError)
        : "Unable to save photo details.",
    };
  }

  return { success: true, photo };
}

export async function deleteReportPhoto(
  projectId: string,
  reportId: string,
  photoId: string,
): Promise<{ error: string; status?: number } | { success: true }> {
  if (!isUuid(projectId) || !isUuid(reportId) || !isUuid(photoId)) {
    return { error: "Photo not found.", status: 404 };
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

  const supabase = await createClient();
  const { data: photo, error } = await supabase
    .from("site_photos")
    .select("*")
    .eq("id", photoId)
    .eq("project_id", projectId)
    .eq("daily_report_id", reportId)
    .eq("business_id", projectResult.project.business_id)
    .maybeSingle();

  if (error) {
    return { error: getDailyReportErrorMessage(error) };
  }

  if (!photo) {
    return { error: "Photo not found.", status: 404 };
  }

  const { error: storageError } = await supabase.storage
    .from(SITE_PHOTO_BUCKET)
    .remove([photo.storage_path]);

  if (storageError) {
    return { error: getDailyReportErrorMessage(storageError) };
  }

  const { error: deleteError } = await supabase
    .from("site_photos")
    .delete()
    .eq("id", photoId)
    .eq("project_id", projectId)
    .eq("daily_report_id", reportId)
    .eq("business_id", projectResult.project.business_id);

  if (deleteError) {
    return { error: getDailyReportErrorMessage(deleteError) };
  }

  return { success: true };
}
