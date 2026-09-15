"use server";

import {
  archiveProject as archiveProjectRecord,
  createProject as createProjectRecord,
  restoreProject as restoreProjectRecord,
  updateProject as updateProjectRecord,
} from "@/lib/projects/mutations";
import { revalidatePath } from "next/cache";

export type ProjectActionResult =
  | { ok: false; message: string }
  | { ok: true; message: string; id?: string };

function revalidateProjectPaths(id?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/projects");

  if (id) {
    revalidatePath(`/projects/${id}`);
  }
}

export async function createProject(
  values: unknown,
): Promise<ProjectActionResult> {
  const result = await createProjectRecord(values);

  if ("error" in result) {
    return { ok: false, message: result.error };
  }

  revalidateProjectPaths(result.id);
  return { ok: true, message: "Project created.", id: result.id };
}

export async function updateProject(
  id: string,
  values: unknown,
): Promise<ProjectActionResult> {
  const result = await updateProjectRecord(id, values);

  if ("error" in result) {
    return { ok: false, message: result.error };
  }

  revalidateProjectPaths(id);
  return { ok: true, message: "Project updated.", id };
}

export async function archiveProject(id: string): Promise<ProjectActionResult> {
  const result = await archiveProjectRecord(id);

  if ("error" in result) {
    return { ok: false, message: result.error };
  }

  revalidateProjectPaths(id);
  return { ok: true, message: "Project archived.", id };
}

export async function restoreProject(id: string): Promise<ProjectActionResult> {
  const result = await restoreProjectRecord(id);

  if ("error" in result) {
    return { ok: false, message: result.error };
  }

  revalidateProjectPaths(id);
  return { ok: true, message: "Project restored.", id };
}
