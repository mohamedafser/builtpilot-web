import { cache } from "react";
import { isProjectStatus } from "@/constants/project";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import {
  paginationMeta,
  parsePagination,
  type Pagination,
  type PaginationMeta,
} from "@/lib/api/pagination";
import { getPendingActionCountsByProject } from "@/lib/project-actions/queries";
import {
  getProjectErrorMessage,
  isProjectUuid,
  sanitizeSearchTerm,
} from "@/lib/projects/helpers";
import { createClient } from "@/lib/supabase/server";
import type { Business, Project, ProjectStatus } from "@/types";

export type ProjectWithPendingActions = Project & {
  pending_action_count: number;
};

export type ProjectFilters = {
  query?: string;
  status?: ProjectStatus;
  archived?: boolean;
};

export type ProjectStats = {
  total: number;
  active: number;
  planning: number;
  completed: number;
};

export async function getWorkspaceScope(): Promise<
  { ok: true; business: Business } | { ok: false; message: string }
> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      message: "You must be signed in to continue.",
    };
  }

  const membership = await getCurrentMembership();

  if (!membership) {
    return {
      ok: false,
      message: "No business workspace was found for this account.",
    };
  }

  return { ok: true, business: membership.business };
}

function parseStatusFilter(
  value: string | undefined,
): ProjectStatus | undefined {
  if (!value) {
    return undefined;
  }

  return isProjectStatus(value) ? value : undefined;
}

export function parseProjectSearchParams(searchParams: {
  q?: string;
  status?: string;
  archived?: string;
}): ProjectFilters {
  return {
    query: searchParams.q?.trim() || undefined,
    status: parseStatusFilter(searchParams.status),
    archived: searchParams.archived === "1" || searchParams.archived === "true",
  };
}

export async function getProjects(
  filters: ProjectFilters = {},
  pagination: Pagination = parsePagination({}),
): Promise<{
  projects: ProjectWithPendingActions[];
  error: string | null;
} & PaginationMeta> {
  const empty = {
    projects: [] as ProjectWithPendingActions[],
    ...paginationMeta(pagination.page, pagination.pageSize, 0),
    error: null as string | null,
  };

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { ...empty, error: scope.message };
  }

  const supabase = await createClient();
  let query = supabase
    .from("projects")
    .select("*", { count: "exact" })
    .eq("business_id", scope.business.id);

  if (filters.archived) {
    query = query.not("archived_at", "is", null);
  } else {
    query = query.is("archived_at", null);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const search = filters.query ? sanitizeSearchTerm(filters.query) : "";

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,client_name.ilike.%${search}%,location.ilike.%${search}%`,
    );
  }

  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .range(pagination.from, pagination.to);

  if (error) {
    return { ...empty, error: getProjectErrorMessage(error) };
  }

  const total = count ?? 0;
  const projects = data ?? [];
  const { counts: pendingCounts } = await getPendingActionCountsByProject(
    projects.map((project) => project.id),
  );

  return {
    projects: projects.map((project) => ({
      ...project,
      pending_action_count: pendingCounts[project.id] ?? 0,
    })),
    error: null,
    ...paginationMeta(pagination.page, pagination.pageSize, total),
  };
}

export const getProjectById = cache(async function getProjectById(
  id: string,
): Promise<
  | { project: Project; error: null }
  | { project: null; error: "not_found" }
  | { project: null; error: string }
> {
  if (!isProjectUuid(id)) {
    return { project: null, error: "not_found" };
  }

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { project: null, error: scope.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("business_id", scope.business.id)
    .maybeSingle();

  if (error) {
    return { project: null, error: getProjectErrorMessage(error) };
  }

  if (!data) {
    return { project: null, error: "not_found" };
  }

  return { project: data, error: null };
});

export const getProjectStats = cache(async function getProjectStats(): Promise<{
  stats: ProjectStats;
  error: string | null;
}> {
  const emptyStats: ProjectStats = {
    total: 0,
    active: 0,
    planning: 0,
    completed: 0,
  };

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { stats: emptyStats, error: scope.message };
  }

  const supabase = await createClient();
  const businessId = scope.business.id;

  function countQuery(status?: ProjectStatus) {
    let query = supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .is("archived_at", null);

    if (status) {
      query = query.eq("status", status);
    }

    return query;
  }

  const [totalResult, activeResult, planningResult, completedResult] =
    await Promise.all([
      countQuery(),
      countQuery("active"),
      countQuery("planning"),
      countQuery("completed"),
    ]);

  const queryError =
    totalResult.error ||
    activeResult.error ||
    planningResult.error ||
    completedResult.error;

  if (queryError) {
    return { stats: emptyStats, error: getProjectErrorMessage(queryError) };
  }

  return {
    stats: {
      total: totalResult.count ?? 0,
      active: activeResult.count ?? 0,
      planning: planningResult.count ?? 0,
      completed: completedResult.count ?? 0,
    },
    error: null,
  };
});

export const getRecentProjects = cache(async function getRecentProjects(
  limit = 5,
): Promise<{
  projects: Project[];
  error: string | null;
}> {
  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { projects: [], error: scope.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("business_id", scope.business.id)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { projects: [], error: getProjectErrorMessage(error) };
  }

  return { projects: data ?? [], error: null };
});
