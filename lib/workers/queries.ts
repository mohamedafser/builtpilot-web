import { cache } from "react";
import { isWorkerRole, isWorkerStatus } from "@/constants/worker";
import {
  paginationMeta,
  parsePagination,
  type Pagination,
  type PaginationMeta,
} from "@/lib/api/pagination";
import { getWorkspaceScope } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import type { Project, Worker, WorkerRole, WorkerStatus } from "@/types";
import {
  getWorkerErrorMessage,
  isUuid,
  sanitizeSearchTerm,
} from "@/lib/workers/helpers";
import type {
  AssignableProjectOption,
  AssignedProject,
  WorkerDetail,
  WorkerFilters,
  WorkerListItem,
  WorkerProjectOption,
} from "@/lib/workers/types";

type AssignmentJoin = {
  id: string;
  status: "active" | "inactive";
  assigned_from: string;
  assigned_until: string | null;
  project_id: string;
  projects:
    { id: string; name: string } | { id: string; name: string }[] | null;
};

function projectFromJoin(
  value: AssignmentJoin["projects"],
): { id: string; name: string } | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapAssignedProjects(rows: AssignmentJoin[] | null): AssignedProject[] {
  if (!rows) {
    return [];
  }

  return rows.flatMap((row) => {
    const project = projectFromJoin(row.projects);

    if (!project) {
      return [];
    }

    return [
      {
        assignment_id: row.id,
        project_id: project.id,
        name: project.name,
        status: row.status,
        assigned_from: row.assigned_from,
        assigned_until: row.assigned_until,
      },
    ];
  });
}

export function parseWorkerSearchParams(searchParams: {
  q?: string;
  status?: string;
  role?: string;
  project?: string;
}): WorkerFilters {
  const status = searchParams.status;
  const role = searchParams.role;
  const project = searchParams.project?.trim();

  return {
    query: searchParams.q?.trim() || undefined,
    status: status && isWorkerStatus(status) ? status : undefined,
    role: role && isWorkerRole(role) ? role : undefined,
    projectId:
      project === "unassigned" || (project && isUuid(project))
        ? project
        : undefined,
  };
}

export async function getWorkers(
  filters: WorkerFilters = {},
  pagination: Pagination = parsePagination({}),
): Promise<
  {
    workers: WorkerListItem[];
    error: string | null;
  } & PaginationMeta
> {
  const empty = {
    workers: [] as WorkerListItem[],
    ...paginationMeta(pagination.page, pagination.pageSize, 0),
    error: null as string | null,
  };

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { ...empty, error: scope.message };
  }

  const supabase = await createClient();
  let query = supabase
    .from("workers")
    .select(
      `
        *,
        project_workers (
          id,
          status,
          assigned_from,
          assigned_until,
          project_id,
          projects ( id, name )
        )
      `,
      { count: "exact" },
    )
    .eq("business_id", scope.business.id);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.role) {
    query = query.eq("role", filters.role);
  }

  if (filters.projectId === "unassigned") {
    const { data: assignedRows, error: assignedError } = await supabase
      .from("project_workers")
      .select("worker_id")
      .eq("business_id", scope.business.id)
      .eq("status", "active");

    if (assignedError) {
      return { ...empty, error: getWorkerErrorMessage(assignedError) };
    }

    const assignedIds = [
      ...new Set((assignedRows ?? []).map((row) => row.worker_id)),
    ];

    if (assignedIds.length > 0) {
      query = query.not("id", "in", `(${assignedIds.join(",")})`);
    }
  } else if (filters.projectId) {
    const { data: assignedRows, error: assignedError } = await supabase
      .from("project_workers")
      .select("worker_id")
      .eq("business_id", scope.business.id)
      .eq("project_id", filters.projectId)
      .eq("status", "active");

    if (assignedError) {
      return { ...empty, error: getWorkerErrorMessage(assignedError) };
    }

    const workerIds = [
      ...new Set((assignedRows ?? []).map((row) => row.worker_id)),
    ];

    if (workerIds.length === 0) {
      return empty;
    }

    query = query.in("id", workerIds);
  }

  const search = filters.query ? sanitizeSearchTerm(filters.query) : "";

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error, count } = await query
    .order("name", { ascending: true })
    .range(pagination.from, pagination.to);

  if (error) {
    return { ...empty, error: getWorkerErrorMessage(error) };
  }

  const workers = (data ?? []).map((row) => {
    const { project_workers, ...worker } = row as Worker & {
      project_workers: AssignmentJoin[] | null;
    };

    return {
      ...worker,
      assigned_projects: mapAssignedProjects(project_workers).filter(
        (assignment) => assignment.status === "active",
      ),
    };
  });

  return {
    workers,
    error: null,
    ...paginationMeta(pagination.page, pagination.pageSize, count ?? 0),
  };
}

export const getWorkerById = cache(async function getWorkerById(
  id: string,
): Promise<
  | { worker: WorkerDetail; error: null }
  | { worker: null; error: "not_found" }
  | { worker: null; error: string }
> {
  if (!isUuid(id)) {
    return { worker: null, error: "not_found" };
  }

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { worker: null, error: scope.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workers")
    .select(
      `
        *,
        project_workers (
          id,
          status,
          assigned_from,
          assigned_until,
          project_id,
          projects ( id, name )
        )
      `,
    )
    .eq("id", id)
    .eq("business_id", scope.business.id)
    .maybeSingle();

  if (error) {
    return { worker: null, error: getWorkerErrorMessage(error) };
  }

  if (!data) {
    return { worker: null, error: "not_found" };
  }

  const { project_workers, ...worker } = data as Worker & {
    project_workers: AssignmentJoin[] | null;
  };

  return {
    worker: {
      ...worker,
      assigned_projects: mapAssignedProjects(project_workers),
    },
    error: null,
  };
});

export async function getActiveWorkers(): Promise<{
  workers: Worker[];
  error: string | null;
}> {
  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { workers: [], error: scope.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workers")
    .select("*")
    .eq("business_id", scope.business.id)
    .eq("status", "active")
    .order("name", { ascending: true })
    .limit(500);

  if (error) {
    return { workers: [], error: getWorkerErrorMessage(error) };
  }

  return { workers: data ?? [], error: null };
}

export function buildAssignableProjectSearchFilter(query: string): string {
  const search = sanitizeSearchTerm(query);

  if (!search) {
    return "";
  }

  return `name.ilike.%${search}%,location.ilike.%${search}%`;
}

export async function getAvailableProjectsForWorker(
  workerId: string,
  search?: string,
): Promise<
  | { projects: Project[]; error: null }
  | { projects: []; error: "not_found" }
  | { projects: []; error: string }
> {
  const workerResult = await getWorkerById(workerId);

  if (workerResult.error === "not_found" || !workerResult.worker) {
    return {
      projects: [],
      error:
        workerResult.error === "not_found" ? "not_found" : workerResult.error,
    };
  }

  const assignedIds = new Set(
    workerResult.worker.assigned_projects
      .filter((assignment) => assignment.status === "active")
      .map((assignment) => assignment.project_id),
  );

  const supabase = await createClient();
  let query = supabase
    .from("projects")
    .select("*")
    .eq("business_id", workerResult.worker.business_id)
    .is("archived_at", null);

  const projectSearch = buildAssignableProjectSearchFilter(search ?? "");

  if (projectSearch) {
    query = query.or(projectSearch);
  }

  const { data, error } = await query
    .order("name", { ascending: true })
    .limit(500);

  if (error) {
    return { projects: [], error: getWorkerErrorMessage(error) };
  }

  return {
    projects: (data ?? []).filter((project) => !assignedIds.has(project.id)),
    error: null,
  };
}

export async function getWorkerProjectFilterOptions(): Promise<{
  projects: WorkerProjectOption[];
  error: string | null;
}> {
  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { projects: [], error: scope.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name")
    .eq("business_id", scope.business.id)
    .is("archived_at", null)
    .order("name", { ascending: true })
    .limit(500);

  if (error) {
    return { projects: [], error: getWorkerErrorMessage(error) };
  }

  return { projects: data ?? [], error: null };
}

export async function getAssignableProjects(search?: string): Promise<{
  projects: AssignableProjectOption[];
  error: string | null;
}> {
  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { projects: [], error: scope.message };
  }

  const supabase = await createClient();
  let query = supabase
    .from("projects")
    .select("id, name, location, status")
    .eq("business_id", scope.business.id)
    .is("archived_at", null);

  const projectSearch = buildAssignableProjectSearchFilter(search ?? "");

  if (projectSearch) {
    query = query.or(projectSearch);
  }

  const { data, error } = await query
    .order("name", { ascending: true })
    .limit(500);

  if (error) {
    return { projects: [], error: getWorkerErrorMessage(error) };
  }

  return { projects: data ?? [], error: null };
}

export type {
  AssignableProjectOption,
  WorkerFilters,
  WorkerProjectOption,
  WorkerRole,
  WorkerStatus,
};
