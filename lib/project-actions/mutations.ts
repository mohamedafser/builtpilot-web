import { getCurrentUser } from "@/lib/auth";
import { createBusinessNotifications } from "@/lib/notifications/create";
import type { UpsertProjectActionInput } from "@/lib/project-actions/helpers";
import type {
  ProjectAction,
  ProjectActionStatus,
} from "@/lib/project-actions/types";
import { createClient } from "@/lib/supabase/server";

type MutationResult =
  | { success: true; action: ProjectAction | null }
  | { error: string; status?: number };

function mapRow(row: Record<string, unknown>): ProjectAction {
  return {
    id: String(row.id),
    business_id: String(row.business_id),
    project_id: String(row.project_id),
    type: row.type as ProjectAction["type"],
    action_key: String(row.action_key),
    title: String(row.title),
    description: (row.description as string | null) ?? null,
    status: row.status as ProjectActionStatus,
    reference_id: (row.reference_id as string | null) ?? null,
    href: (row.href as string | null) ?? null,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
    created_by: (row.created_by as string | null) ?? null,
    completed_by: (row.completed_by as string | null) ?? null,
    completed_at: (row.completed_at as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

/**
 * Create or refresh a pending project action.
 * Dedupes on (project_id, action_key, reference_id) while pending.
 */
export async function upsertPendingProjectAction(
  input: UpsertProjectActionInput,
): Promise<MutationResult> {
  const supabase = await createClient();
  const referenceId = input.referenceId ?? null;

  let existingQuery = supabase
    .from("project_actions")
    .select("*")
    .eq("project_id", input.projectId)
    .eq("action_key", input.actionKey)
    .eq("status", "pending");

  existingQuery = referenceId
    ? existingQuery.eq("reference_id", referenceId)
    : existingQuery.is("reference_id", null);

  const { data: existing, error: existingError } = await existingQuery
    .maybeSingle();

  if (existingError) {
    return { error: existingError.message };
  }

  if (existing) {
    const { data, error } = await supabase
      .from("project_actions")
      .update({
        title: input.title.slice(0, 160),
        description: input.description?.slice(0, 500) ?? null,
        href: input.href?.slice(0, 500) ?? null,
        metadata: input.metadata ?? existing.metadata ?? {},
        type: input.type,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      return { error: error.message };
    }

    return { success: true, action: mapRow(data) };
  }

  const { data, error } = await supabase
    .from("project_actions")
    .insert({
      business_id: input.businessId,
      project_id: input.projectId,
      type: input.type,
      action_key: input.actionKey,
      title: input.title.slice(0, 160),
      description: input.description?.slice(0, 500) ?? null,
      status: "pending",
      reference_id: referenceId,
      href: input.href?.slice(0, 500) ?? null,
      metadata: input.metadata ?? {},
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();

  if (error) {
    // Race: another request created the same pending action.
    if (error.code === "23505") {
      return { success: true, action: null };
    }
    return { error: error.message };
  }

  if (input.notify) {
    const preferenceKey =
      input.notify.preferenceType === "material"
        ? "material_notifications"
        : input.notify.preferenceType === "labour"
          ? "labour_notifications"
          : input.notify.preferenceType === "quotation"
            ? "quotation_notifications"
            : undefined;

    void createBusinessNotifications({
      businessId: input.businessId,
      projectId: input.projectId,
      type: input.notify.preferenceType ?? "system",
      title: input.notify.title,
      message: input.notify.message,
      actionUrl: input.href ?? undefined,
      dedupeKey: `project_action:${input.projectId}:${input.actionKey}:${referenceId ?? "none"}`,
      preferenceKey,
      excludeUserId: input.createdBy ?? undefined,
    });
  }

  return { success: true, action: mapRow(data) };
}

export async function completeProjectAction(input: {
  actionId: string;
  status?: "completed" | "dismissed";
  userId?: string | null;
}): Promise<MutationResult> {
  const user = input.userId ? { id: input.userId } : await getCurrentUser();
  const supabase = await createClient();
  const nextStatus = input.status ?? "completed";

  const { data: existing, error: loadError } = await supabase
    .from("project_actions")
    .select("*")
    .eq("id", input.actionId)
    .maybeSingle();

  if (loadError) {
    return { error: loadError.message };
  }

  if (!existing) {
    return { error: "Action not found.", status: 404 };
  }

  if (existing.status !== "pending") {
    return { success: true, action: mapRow(existing) };
  }

  const { data, error } = await supabase
    .from("project_actions")
    .update({
      status: nextStatus,
      completed_at: new Date().toISOString(),
      completed_by: user?.id ?? null,
    })
    .eq("id", input.actionId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    const { data: current } = await supabase
      .from("project_actions")
      .select("*")
      .eq("id", input.actionId)
      .maybeSingle();
    return {
      success: true,
      action: current ? mapRow(current) : null,
    };
  }

  return { success: true, action: mapRow(data) };
}

export async function completePendingActionsByReference(input: {
  projectId: string;
  actionKey: string;
  referenceId: string;
  status?: "completed" | "dismissed";
  userId?: string | null;
}): Promise<MutationResult> {
  const user = input.userId ? { id: input.userId } : await getCurrentUser();
  const supabase = await createClient();
  const nextStatus = input.status ?? "completed";

  const { data, error } = await supabase
    .from("project_actions")
    .update({
      status: nextStatus,
      completed_at: new Date().toISOString(),
      completed_by: user?.id ?? null,
    })
    .eq("project_id", input.projectId)
    .eq("action_key", input.actionKey)
    .eq("reference_id", input.referenceId)
    .eq("status", "pending")
    .select("*");

  if (error) {
    return { error: error.message };
  }

  const first = data?.[0] ?? null;
  return { success: true, action: first ? mapRow(first) : null };
}

export async function completePendingActionsByKey(input: {
  projectId: string;
  actionKey: string;
  status?: "completed" | "dismissed";
  userId?: string | null;
}): Promise<MutationResult> {
  const user = input.userId ? { id: input.userId } : await getCurrentUser();
  const supabase = await createClient();
  const nextStatus = input.status ?? "completed";

  const { data, error } = await supabase
    .from("project_actions")
    .update({
      status: nextStatus,
      completed_at: new Date().toISOString(),
      completed_by: user?.id ?? null,
    })
    .eq("project_id", input.projectId)
    .eq("action_key", input.actionKey)
    .eq("status", "pending")
    .select("*");

  if (error) {
    return { error: error.message };
  }

  const first = data?.[0] ?? null;
  return { success: true, action: first ? mapRow(first) : null };
}

export async function updatePendingActionDescription(input: {
  projectId: string;
  actionKey: string;
  referenceId: string;
  title?: string;
  description: string;
}): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("project_actions")
    .update({
      ...(input.title ? { title: input.title.slice(0, 160) } : {}),
      description: input.description.slice(0, 500),
    })
    .eq("project_id", input.projectId)
    .eq("action_key", input.actionKey)
    .eq("reference_id", input.referenceId)
    .eq("status", "pending");
}
