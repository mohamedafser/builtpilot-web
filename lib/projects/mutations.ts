import { getWorkspaceScope } from "@/lib/projects/queries";
import {
  emptyToNull,
  getProjectErrorMessage,
  isProjectUuid,
  parseBudget,
  type ProjectMutationResult,
} from "@/lib/projects/helpers";
import { createClient } from "@/lib/supabase/server";
import {
  projectSchema,
  type ProjectFormValues,
} from "@/lib/validations/project";
import { getZodErrorMessage } from "@/lib/validations/error";

function projectWritePayload(values: ProjectFormValues) {
  return {
    name: values.name,
    client_name: emptyToNull(values.client_name),
    client_phone: emptyToNull(values.client_phone),
    client_email: emptyToNull(values.client_email),
    location: emptyToNull(values.location),
    description: emptyToNull(values.description),
    estimated_budget: parseBudget(values.estimated_budget),
    status: values.status,
    start_date: emptyToNull(values.start_date),
    expected_end_date: emptyToNull(values.expected_end_date),
  };
}

export async function createProject(
  values: unknown,
): Promise<ProjectMutationResult> {
  const parsed = projectSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Invalid project details."),
    };
  }

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { error: scope.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      business_id: scope.business.id,
      ...projectWritePayload(parsed.data),
    })
    .select("id")
    .single();

  if (error) {
    return { error: getProjectErrorMessage(error) };
  }

  return { success: true, id: data.id };
}

export async function updateProject(
  id: string,
  values: unknown,
): Promise<ProjectMutationResult> {
  if (!isProjectUuid(id)) {
    return { error: "Project not found." };
  }

  const parsed = projectSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Invalid project details."),
    };
  }

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { error: scope.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update(projectWritePayload(parsed.data))
    .eq("id", id)
    .eq("business_id", scope.business.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getProjectErrorMessage(error) };
  }

  if (!data) {
    return { error: "Project not found." };
  }

  return { success: true, id: data.id };
}

export async function archiveProject(
  id: string,
): Promise<ProjectMutationResult> {
  return setArchivedAt(id, new Date().toISOString());
}

export async function restoreProject(
  id: string,
): Promise<ProjectMutationResult> {
  return setArchivedAt(id, null);
}

async function setArchivedAt(
  id: string,
  archivedAt: string | null,
): Promise<ProjectMutationResult> {
  if (!isProjectUuid(id)) {
    return { error: "Project not found." };
  }

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { error: scope.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update({ archived_at: archivedAt })
    .eq("id", id)
    .eq("business_id", scope.business.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getProjectErrorMessage(error) };
  }

  if (!data) {
    return { error: "Project not found." };
  }

  return { success: true, id: data.id };
}
