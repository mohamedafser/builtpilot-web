import type { ProjectStatus, Worker, WorkerRole, WorkerStatus } from "@/types";

export type AssignedProject = {
  assignment_id: string;
  project_id: string;
  name: string;
  status: "active" | "inactive";
  assigned_from: string;
  assigned_until: string | null;
};

export type WorkerListItem = Worker & {
  assigned_projects: AssignedProject[];
};

export type WorkerDetail = WorkerListItem;

export type WorkerFilters = {
  query?: string;
  status?: WorkerStatus;
  role?: WorkerRole;
  projectId?: string;
};

export type WorkerProjectOption = {
  id: string;
  name: string;
};

export type AssignableProjectOption = WorkerProjectOption & {
  location: string | null;
  status: ProjectStatus;
};
