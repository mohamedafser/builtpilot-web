import type {
  ProjectAction,
  ProjectActionKey,
  ProjectActionType,
  ProjectActionView,
} from "@/lib/project-actions/types";
import { PROJECT_ACTION_KEYS } from "@/lib/project-actions/types";

const CTA_BY_KEY: Record<string, string> = {
  [PROJECT_ACTION_KEYS.RECEIVE_MATERIAL]: "Receive material",
  [PROJECT_ACTION_KEYS.REVIEW_LABOUR]: "Mark attendance",
  [PROJECT_ACTION_KEYS.REVIEW_QUOTATION]: "Review quotation",
};

export function actionCtaLabel(actionKey: string): string {
  return CTA_BY_KEY[actionKey] ?? "View";
}

export function toActionView(
  action: ProjectAction,
  projectName?: string,
): ProjectActionView {
  return {
    ...action,
    cta_label: actionCtaLabel(action.action_key),
    project_name: projectName,
  };
}

export function materialReceiveHref(
  projectId: string,
  materialId: string,
  projectMaterialId?: string,
): string {
  const params = new URLSearchParams({
    action: "receive",
    material: materialId,
  });
  if (projectMaterialId) {
    params.set("highlight", projectMaterialId);
  }
  return `/projects/${projectId}/materials?${params.toString()}`;
}

export function labourReviewHref(projectId: string): string {
  return `/projects/${projectId}/labour`;
}

export function quotationReviewHref(
  projectId: string,
  quotationId: string,
): string {
  return `/quotations/${quotationId}?project=${projectId}`;
}

export function formatPendingCountLabel(count: number): string {
  if (count <= 0) {
    return "All caught up";
  }
  if (count === 1) {
    return "1 action";
  }
  return `${count} actions`;
}

export type UpsertProjectActionInput = {
  businessId: string;
  projectId: string;
  type: ProjectActionType;
  actionKey: ProjectActionKey | string;
  title: string;
  description?: string | null;
  referenceId?: string | null;
  href?: string | null;
  metadata?: Record<string, unknown>;
  createdBy?: string | null;
  notify?: {
    title: string;
    message: string;
    preferenceType?: "material" | "labour" | "quotation" | "system";
  };
};
