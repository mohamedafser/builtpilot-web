import { cache } from "react";
import { WORKER_ROLE_PLURAL_LABELS } from "@/constants/worker";
import {
  addPaise,
  formatLabourDays,
  formatAverageWorkers,
  formatPaise,
  isIsoDate,
  labourDayUnits,
  startOfMonthIso,
  todayIsoDate,
} from "@/lib/labour/money";
import { getLabourErrorMessage, isUuid } from "@/lib/labour/helpers";
import { sanitizeSearchTerm } from "@/lib/projects/helpers";
import type {
  AttendanceSheetRow,
  LabourSummary,
  LabourTodayStats,
  ProjectLabourDashboard,
  ProjectWorkerAssignment,
  RoleLabourTotal,
} from "@/lib/labour/types";
import { getProjectById } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import type {
  AttendanceStatus,
  Worker,
  WorkerAttendance,
  WorkerRole,
} from "@/types";

type ProjectWorkerJoin = {
  id: string;
  status: "active" | "inactive";
  assigned_from: string;
  assigned_until: string | null;
  project_id: string;
  worker_id: string;
  workers: Worker | Worker[] | null;
};

function workerFromJoin(value: ProjectWorkerJoin["workers"]): Worker | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function emptyTodayStats(date: string): LabourTodayStats {
  return {
    date,
    assigned_workers: 0,
    active_workers: 0,
    present: 0,
    half_day: 0,
    absent: 0,
    unmarked: 0,
    labour_cost: "0.00",
  };
}

function emptySummary(from: string, to: string): LabourSummary {
  return {
    from,
    to,
    total_labour_days: "0",
    total_labour_cost: "0.00",
    average_workers_per_day: "0",
    present_days: 0,
    half_day_days: 0,
    absent_days: 0,
    days_recorded: 0,
    top_roles: [],
  };
}

export function parseLabourDate(value: string | null | undefined): string {
  if (value && isIsoDate(value)) {
    return value;
  }

  return todayIsoDate();
}

export async function getProjectWorkers(
  projectId: string,
  options: { includeInactive?: boolean } = {},
): Promise<
  | { assignments: ProjectWorkerAssignment[]; error: null }
  | { assignments: []; error: "not_found" }
  | { assignments: []; error: string }
> {
  if (!isUuid(projectId)) {
    return { assignments: [], error: "not_found" };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      assignments: [],
      error:
        projectResult.error === "not_found" ? "not_found" : projectResult.error,
    };
  }

  const supabase = await createClient();
  let query = supabase
    .from("project_workers")
    .select(
      `
        id,
        status,
        assigned_from,
        assigned_until,
        project_id,
        worker_id,
        workers (*)
      `,
    )
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id);

  if (!options.includeInactive) {
    query = query.eq("status", "active");
  }

  const { data, error } = await query.order("created_at", { ascending: true });

  if (error) {
    return { assignments: [], error: getLabourErrorMessage(error) };
  }

  const assignments = ((data as ProjectWorkerJoin[] | null) ?? []).flatMap(
    (row) => {
      const worker = workerFromJoin(row.workers);

      if (!worker) {
        return [];
      }

      return [
        {
          assignment_id: row.id,
          project_id: row.project_id,
          name: worker.name,
          status: row.status,
          assigned_from: row.assigned_from,
          assigned_until: row.assigned_until,
          worker,
        } satisfies ProjectWorkerAssignment,
      ];
    },
  );

  assignments.sort((left, right) =>
    left.worker.name.localeCompare(right.worker.name),
  );

  return { assignments, error: null };
}

export function buildWorkerSearchFilter(query: string): string {
  const search = sanitizeSearchTerm(query);

  if (!search) {
    return "";
  }

  return `name.ilike.%${search}%,phone.ilike.%${search}%`;
}

export async function getAvailableWorkersForProject(
  projectId: string,
  search?: string,
): Promise<
  | { workers: Worker[]; error: null }
  | { workers: []; error: "not_found" }
  | { workers: []; error: string }
> {
  const assigned = await getProjectWorkers(projectId);

  if (assigned.error) {
    return { workers: [], error: assigned.error };
  }

  const projectResult = await getProjectById(projectId);

  if (!projectResult.project) {
    return { workers: [], error: projectResult.error ?? "not_found" };
  }

  const assignedIds = new Set(
    assigned.assignments.map((assignment) => assignment.worker.id),
  );

  const supabase = await createClient();
  let query = supabase
    .from("workers")
    .select("*")
    .eq("business_id", projectResult.project.business_id)
    .eq("status", "active");

  const workerSearch = buildWorkerSearchFilter(search ?? "");

  if (workerSearch) {
    query = query.or(workerSearch);
  }

  const { data, error } = await query
    .order("name", { ascending: true })
    .limit(500);

  if (error) {
    return { workers: [], error: getLabourErrorMessage(error) };
  }

  return {
    workers: (data ?? []).filter((worker) => !assignedIds.has(worker.id)),
    error: null,
  };
}

export async function getAttendanceSheet(
  projectId: string,
  attendanceDate: string,
): Promise<
  | { date: string; rows: AttendanceSheetRow[]; error: null }
  | { date: string; rows: []; error: "not_found" }
  | { date: string; rows: []; error: string }
> {
  const date = parseLabourDate(attendanceDate);
  const assigned = await getProjectWorkers(projectId);

  if (assigned.error) {
    return { date, rows: [], error: assigned.error };
  }

  const projectResult = await getProjectById(projectId);

  if (!projectResult.project) {
    return {
      date,
      rows: [],
      error: projectResult.error ?? "not_found",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("worker_attendance")
    .select("*")
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id)
    .eq("attendance_date", date);

  if (error) {
    return { date, rows: [], error: getLabourErrorMessage(error) };
  }

  const attendanceByWorker = new Map(
    (data ?? []).map((row) => [row.worker_id, row]),
  );

  const rows: AttendanceSheetRow[] = assigned.assignments.map((assignment) => {
    const record = attendanceByWorker.get(assignment.worker.id) ?? null;

    return {
      worker: assignment.worker,
      assignment_id: assignment.assignment_id,
      attendance: record
        ? {
            id: record.id,
            status: record.status,
            hours_worked:
              record.hours_worked == null ? null : String(record.hours_worked),
            wage: record.wage,
            notes: record.notes,
          }
        : null,
    };
  });

  return { date, rows, error: null };
}

export const getLabourSummary = cache(async function getLabourSummary(
  projectId: string,
  from: string,
  to: string,
): Promise<
  | { summary: LabourSummary; error: null }
  | { summary: LabourSummary; error: "not_found" }
  | { summary: LabourSummary; error: string }
> {
  const rangeFrom = parseLabourDate(from);
  const rangeTo = parseLabourDate(to);
  const empty = emptySummary(rangeFrom, rangeTo);

  if (rangeTo < rangeFrom) {
    return {
      summary: empty,
      error: "End date must be on or after the start date.",
    };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      summary: empty,
      error:
        projectResult.error === "not_found" ? "not_found" : projectResult.error,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("worker_attendance")
    .select("status, wage, attendance_date, worker_id, workers ( role )")
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id)
    .gte("attendance_date", rangeFrom)
    .lte("attendance_date", rangeTo);

  if (error) {
    return { summary: empty, error: getLabourErrorMessage(error) };
  }

  type SummaryRow = Pick<
    WorkerAttendance,
    "status" | "wage" | "attendance_date" | "worker_id"
  > & {
    workers: { role: WorkerRole } | { role: WorkerRole }[] | null;
  };

  const records = (data ?? []) as SummaryRow[];
  let presentDays = 0;
  let halfDayDays = 0;
  let absentDays = 0;
  let halfDayUnits = 0;
  const dates = new Set<string>();
  const wages: string[] = [];
  const roleUnits = new Map<
    WorkerRole,
    { units: number; paise: number; records: number }
  >();

  for (const record of records) {
    dates.add(record.attendance_date);
    wages.push(record.wage);
    halfDayUnits += labourDayUnits(record.status);

    if (record.status === "present") {
      presentDays += 1;
    } else if (record.status === "half_day") {
      halfDayDays += 1;
    } else {
      absentDays += 1;
    }

    const roleValue = record.workers;
    const role = Array.isArray(roleValue)
      ? roleValue[0]?.role
      : roleValue?.role;

    if (!role) {
      continue;
    }

    const current = roleUnits.get(role) ?? {
      units: 0,
      paise: 0,
      records: 0,
    };
    current.units += labourDayUnits(record.status);
    current.paise += addPaise([record.wage]);
    current.records += 1;
    roleUnits.set(role, current);
  }

  const topRoles: RoleLabourTotal[] = [...roleUnits.entries()]
    .map(([role, totals]) => ({
      role,
      label: WORKER_ROLE_PLURAL_LABELS[role],
      labour_days: formatLabourDays(totals.units),
      labour_cost: formatPaise(totals.paise),
      records: totals.records,
    }))
    .sort((left, right) => {
      const dayDelta = Number(right.labour_days) - Number(left.labour_days);
      if (dayDelta !== 0) {
        return dayDelta;
      }

      return right.records - left.records;
    })
    .slice(0, 4);

  return {
    summary: {
      from: rangeFrom,
      to: rangeTo,
      total_labour_days: formatLabourDays(halfDayUnits),
      total_labour_cost: formatPaise(addPaise(wages)),
      average_workers_per_day: formatAverageWorkers(halfDayUnits, dates.size),
      present_days: presentDays,
      half_day_days: halfDayDays,
      absent_days: absentDays,
      days_recorded: dates.size,
      top_roles: topRoles,
    },
    error: null,
  };
});

export async function getLabourTodayStats(
  projectId: string,
  date: string,
): Promise<
  | { stats: LabourTodayStats; error: null }
  | { stats: LabourTodayStats; error: "not_found" }
  | { stats: LabourTodayStats; error: string }
> {
  const attendanceDate = parseLabourDate(date);
  const empty = emptyTodayStats(attendanceDate);
  const sheet = await getAttendanceSheet(projectId, attendanceDate);

  if (sheet.error) {
    return { stats: empty, error: sheet.error };
  }

  let present = 0;
  let halfDay = 0;
  let absent = 0;
  const wages: string[] = [];

  for (const row of sheet.rows) {
    if (!row.attendance) {
      continue;
    }

    wages.push(row.attendance.wage);

    if (row.attendance.status === "present") {
      present += 1;
    } else if (row.attendance.status === "half_day") {
      halfDay += 1;
    } else {
      absent += 1;
    }
  }

  const assignedWorkers = sheet.rows.length;
  const marked = present + halfDay + absent;

  return {
    stats: {
      date: attendanceDate,
      assigned_workers: assignedWorkers,
      active_workers: sheet.rows.filter((row) => row.worker.status === "active")
        .length,
      present,
      half_day: halfDay,
      absent,
      unmarked: Math.max(0, assignedWorkers - marked),
      labour_cost: formatPaise(addPaise(wages)),
    },
    error: null,
  };
}

export const getProjectLabourDashboard = cache(
  async function getProjectLabourDashboard(
    projectId: string,
    options: { date?: string; from?: string; to?: string } = {},
  ): Promise<
    | { dashboard: ProjectLabourDashboard; error: null }
    | { dashboard: null; error: "not_found" }
    | { dashboard: null; error: string }
  > {
    const date = parseLabourDate(options.date);
    const from = options.from
      ? parseLabourDate(options.from)
      : startOfMonthIso(date);
    const to = options.to ? parseLabourDate(options.to) : date;

    const [assigned, today, summary, sheet] = await Promise.all([
      getProjectWorkers(projectId),
      getLabourTodayStats(projectId, date),
      getLabourSummary(projectId, from, to),
      getAttendanceSheet(projectId, date),
    ]);

    if (assigned.error === "not_found" || today.error === "not_found") {
      return { dashboard: null, error: "not_found" };
    }

    if (assigned.error) {
      return { dashboard: null, error: assigned.error };
    }

    if (today.error) {
      return { dashboard: null, error: today.error };
    }

    if (summary.error && summary.error !== "not_found") {
      return { dashboard: null, error: summary.error };
    }

    if (sheet.error && sheet.error !== "not_found") {
      return { dashboard: null, error: sheet.error };
    }

    const attendanceByWorker = new Map(
      sheet.rows.map((row) => [row.worker.id, row.attendance]),
    );

    return {
      dashboard: {
        assigned: assigned.assignments.map((assignment) => ({
          ...assignment,
          today_attendance: attendanceByWorker.get(assignment.worker.id) ?? null,
        })),
        today: today.stats,
        summary: summary.summary,
      },
      error: null,
    };
  },
);

export type AttendanceStatusFilter = AttendanceStatus;
