export const PROJECT_ACTION_TYPES = [
  "material",
  "labour",
  "quotation",
  "payment",
  "task",
  "inspection",
] as const;

export type ProjectActionType = (typeof PROJECT_ACTION_TYPES)[number];

export const PROJECT_ACTION_STATUSES = [
  "pending",
  "completed",
  "dismissed",
] as const;

export type ProjectActionStatus = (typeof PROJECT_ACTION_STATUSES)[number];

export const PROJECT_ACTION_KEYS = {
  RECEIVE_MATERIAL: "RECEIVE_MATERIAL",
  REVIEW_LABOUR: "REVIEW_LABOUR",
  REVIEW_QUOTATION: "REVIEW_QUOTATION",
} as const;

export type ProjectActionKey =
  (typeof PROJECT_ACTION_KEYS)[keyof typeof PROJECT_ACTION_KEYS];

export type ProjectAction = {
  id: string;
  business_id: string;
  project_id: string;
  type: ProjectActionType;
  action_key: string;
  title: string;
  description: string | null;
  status: ProjectActionStatus;
  reference_id: string | null;
  href: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectActionView = ProjectAction & {
  cta_label: string;
  project_name?: string;
};

export type ProjectActionCounts = {
  totalPending: number;
  byType: Partial<Record<ProjectActionType, number>>;
};
