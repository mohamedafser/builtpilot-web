import type { AttendanceStatus, Worker, WorkerRole } from "@/types";
import type { AssignedProject } from "@/lib/workers/types";

export type ProjectWorkerAssignment = AssignedProject & {
  worker: Worker;
};

/** Assigned worker row on the labour dashboard, with today's attendance mark. */
export type ProjectLabourAssignmentRow = ProjectWorkerAssignment & {
  today_attendance: AttendanceSheetRow["attendance"];
};

export type AttendanceSheetRow = {
  worker: Worker;
  assignment_id: string;
  attendance: {
    id: string;
    status: AttendanceStatus;
    hours_worked: string | null;
    wage: string;
    notes: string | null;
  } | null;
};

export type RoleLabourTotal = {
  role: WorkerRole;
  label: string;
  labour_days: string;
  labour_cost: string;
  records: number;
};

export type LabourSummary = {
  from: string;
  to: string;
  total_labour_days: string;
  total_labour_cost: string;
  average_workers_per_day: string;
  present_days: number;
  half_day_days: number;
  absent_days: number;
  days_recorded: number;
  top_roles: RoleLabourTotal[];
};

export type LabourTodayStats = {
  date: string;
  assigned_workers: number;
  active_workers: number;
  present: number;
  half_day: number;
  absent: number;
  unmarked: number;
  labour_cost: string;
};

export type ProjectLabourDashboard = {
  assigned: ProjectLabourAssignmentRow[];
  today: LabourTodayStats;
  summary: LabourSummary;
};
