import { toActionView } from "@/lib/project-actions/helpers";
import type {
  ProjectAction,
  ProjectActionCounts,
  ProjectActionStatus,
  ProjectActionType,
  ProjectActionView,
} from "@/lib/project-actions/types";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceScope } from "@/lib/projects/queries";

function mapRow(row: Record<string, unknown>): ProjectAction {
  return {
    id: String(row.id),
    business_id: String(row.business_id),
    project_id: String(row.project_id),
    type: row.type as ProjectActionType,
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

export async function getProjectActions(
  projectId: string,
  options: {
    status?: ProjectActionStatus | "all";
    limit?: number;
  } = {},
): Promise<{ actions: ProjectActionView[]; error: string | null }> {
  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { actions: [], error: scope.message };
  }

  const status = options.status ?? "pending";
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const supabase = await createClient();

  let query = supabase
    .from("project_actions")
    .select("*")
    .eq("business_id", scope.business.id)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return { actions: [], error: error.message };
  }

  return {
    actions: (data ?? []).map((row) => toActionView(mapRow(row))),
    error: null,
  };
}

export async function getPendingActionCountsByProject(
  projectIds: string[],
): Promise<{
  counts: Record<string, number>;
  error: string | null;
}> {
  if (projectIds.length === 0) {
    return { counts: {}, error: null };
  }

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { counts: {}, error: scope.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_actions")
    .select("project_id")
    .eq("business_id", scope.business.id)
    .eq("status", "pending")
    .in("project_id", projectIds);

  if (error) {
    return { counts: {}, error: error.message };
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = String(row.project_id);
    counts[id] = (counts[id] ?? 0) + 1;
  }

  return { counts, error: null };
}

export async function getBusinessPendingActionSummary(): Promise<{
  summary: ProjectActionCounts & {
    projectsWithActions: number;
    receiveMaterialPending: number;
    actions: ProjectActionView[];
  };
  error: string | null;
}> {
  const empty = {
    totalPending: 0,
    byType: {} as Partial<Record<ProjectActionType, number>>,
    projectsWithActions: 0,
    receiveMaterialPending: 0,
    actions: [] as ProjectActionView[],
  };

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { summary: empty, error: scope.message };
  }

  const supabase = await createClient();
  const [{ data, error }, receiveCountResult] = await Promise.all([
    supabase
      .from("project_actions")
      .select("*, projects!inner(name)")
      .eq("business_id", scope.business.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("project_actions")
      .select("id", { count: "exact", head: true })
      .eq("business_id", scope.business.id)
      .eq("status", "pending")
      .eq("action_key", "RECEIVE_MATERIAL"),
  ]);

  if (error) {
    return { summary: empty, error: error.message };
  }

  const actions = (data ?? []).map((row) => {
    const projectName =
      row.projects &&
      typeof row.projects === "object" &&
      "name" in row.projects
        ? String((row.projects as { name: string }).name)
        : undefined;
    return toActionView(mapRow(row as Record<string, unknown>), projectName);
  });

  const byType: Partial<Record<ProjectActionType, number>> = {};
  const projectSet = new Set<string>();

  for (const action of actions) {
    byType[action.type] = (byType[action.type] ?? 0) + 1;
    projectSet.add(action.project_id);
  }

  return {
    summary: {
      totalPending: actions.length,
      byType,
      projectsWithActions: projectSet.size,
      receiveMaterialPending: receiveCountResult.count ?? 0,
      actions,
    },
    error: null,
  };
}
