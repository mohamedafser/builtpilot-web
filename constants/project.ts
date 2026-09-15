import type { Project, ProjectStatus } from "@/types";

export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
] as const;

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "Planning",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function isProjectStatus(value: string): value is ProjectStatus {
  return (PROJECT_STATUSES as readonly string[]).includes(value);
}

export const UPCOMING_PROJECT_MODULES = [
  {
    title: "Payments",
    description: "Follow client invoices, receipts, and outstanding balances.",
  },
  {
    title: "Documents",
    description: "Store drawings, photos, and project files in one place.",
  },
] as const;

export function projectToFormValues(project: Project) {
  return {
    name: project.name,
    client_name: project.client_name ?? "",
    client_phone: project.client_phone ?? "",
    client_email: project.client_email ?? "",
    location: project.location ?? "",
    description: project.description ?? "",
    estimated_budget:
      project.estimated_budget == null || project.estimated_budget === ""
        ? ""
        : String(project.estimated_budget),
    status: project.status,
    start_date: project.start_date ?? "",
    expected_end_date: project.expected_end_date ?? "",
  };
}
