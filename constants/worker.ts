import type {
  AttendanceStatus,
  Worker,
  WorkerRole,
  WorkerStatus,
} from "@/types";

export const WORKER_ROLES: readonly WorkerRole[] = [
  "mason",
  "helper",
  "carpenter",
  "electrician",
  "plumber",
  "painter",
  "welder",
  "operator",
  "supervisor",
  "other",
] as const;

export const WORKER_ROLE_LABELS: Record<WorkerRole, string> = {
  mason: "Mason",
  helper: "Helper",
  carpenter: "Carpenter",
  electrician: "Electrician",
  plumber: "Plumber",
  painter: "Painter",
  welder: "Welder",
  operator: "Operator",
  supervisor: "Supervisor",
  other: "Other",
};

export const WORKER_ROLE_PLURAL_LABELS: Record<WorkerRole, string> = {
  mason: "Masons",
  helper: "Helpers",
  carpenter: "Carpenters",
  electrician: "Electricians",
  plumber: "Plumbers",
  painter: "Painters",
  welder: "Welders",
  operator: "Operators",
  supervisor: "Supervisors",
  other: "Other",
};

export function isWorkerRole(value: string): value is WorkerRole {
  return (WORKER_ROLES as readonly string[]).includes(value);
}

export const WORKER_STATUSES: readonly WorkerStatus[] = [
  "active",
  "inactive",
] as const;

export const WORKER_STATUS_LABELS: Record<WorkerStatus, string> = {
  active: "Active",
  inactive: "Inactive",
};

export function isWorkerStatus(value: string): value is WorkerStatus {
  return (WORKER_STATUSES as readonly string[]).includes(value);
}

export const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = [
  "present",
  "half_day",
  "absent",
] as const;

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  half_day: "Half day",
  absent: "Absent",
};

export function isAttendanceStatus(value: string): value is AttendanceStatus {
  return (ATTENDANCE_STATUSES as readonly string[]).includes(value);
}

export const DEFAULT_PRESENT_HOURS = "8";
export const DEFAULT_HALF_DAY_HOURS = "4";

export const LABOUR_DATE_PRESETS = [
  "today",
  "yesterday",
  "this_week",
  "this_month",
  "custom",
] as const;

export type LabourDatePreset = (typeof LABOUR_DATE_PRESETS)[number];

export const LABOUR_DATE_PRESET_LABELS: Record<LabourDatePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This week",
  this_month: "This month",
  custom: "Custom range",
};

export function isLabourDatePreset(value: string): value is LabourDatePreset {
  return (LABOUR_DATE_PRESETS as readonly string[]).includes(value);
}

export function workerToFormValues(worker: Worker) {
  return {
    name: worker.name,
    phone: worker.phone ?? "",
    role: worker.role,
    daily_wage: worker.daily_wage,
    notes: worker.notes ?? "",
    status: worker.status,
  };
}
