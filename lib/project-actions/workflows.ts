import { getCurrentUser } from "@/lib/auth";
import {
  materialReceiveHref,
  labourReviewHref,
  quotationReviewHref,
} from "@/lib/project-actions/helpers";
import {
  completePendingActionsByKey,
  completePendingActionsByReference,
  updatePendingActionDescription,
  upsertPendingProjectAction,
} from "@/lib/project-actions/mutations";
import { PROJECT_ACTION_KEYS } from "@/lib/project-actions/types";
import {
  formatMilli,
  formatQuantityWithUnit,
  parseQuantityToMilli,
} from "@/lib/materials/stock";
import { createClient } from "@/lib/supabase/server";
import type { MaterialUnit } from "@/types";

export async function createReceiveMaterialAction(input: {
  businessId: string;
  projectId: string;
  projectMaterialId: string;
  materialId: string;
  materialName: string;
  unit: MaterialUnit;
  plannedQuantity: string | null;
}): Promise<void> {
  const user = await getCurrentUser();
  const qtyLabel = input.plannedQuantity
    ? formatQuantityWithUnit(input.plannedQuantity, input.unit)
    : null;

  await upsertPendingProjectAction({
    businessId: input.businessId,
    projectId: input.projectId,
    type: "material",
    actionKey: PROJECT_ACTION_KEYS.RECEIVE_MATERIAL,
    title: `Receive ${input.materialName}`,
    description: qtyLabel
      ? `${qtyLabel} added to this project — receive the material.`
      : `${input.materialName} was added — receive stock onto the site.`,
    referenceId: input.projectMaterialId,
    href: materialReceiveHref(
      input.projectId,
      input.materialId,
      input.projectMaterialId,
    ),
    metadata: {
      material_id: input.materialId,
      planned_quantity: input.plannedQuantity,
    },
    createdBy: user?.id ?? null,
    notify: {
      title: "Material added – receive material",
      message: qtyLabel
        ? `${input.materialName} (${qtyLabel}) needs to be received.`
        : `${input.materialName} needs to be received on this project.`,
      preferenceType: "material",
    },
  });
}

export async function syncReceiveMaterialActionAfterReceipt(input: {
  projectId: string;
  materialId: string;
  businessId: string;
  userId?: string | null;
}): Promise<void> {
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from("project_materials")
    .select("id, planned_quantity, materials(name, unit)")
    .eq("project_id", input.projectId)
    .eq("material_id", input.materialId)
    .eq("business_id", input.businessId)
    .maybeSingle();

  if (!assignment) {
    return;
  }

  const { data: balance } = await supabase
    .from("material_stock_balances")
    .select("total_received")
    .eq("project_id", input.projectId)
    .eq("material_id", input.materialId)
    .maybeSingle();

  const plannedMilli = parseQuantityToMilli(
    assignment.planned_quantity ?? "",
  );
  const receivedMilli = parseQuantityToMilli(balance?.total_received ?? "0") ?? 0;
  const material = assignment.materials as
    | { name: string; unit: MaterialUnit }
    | { name: string; unit: MaterialUnit }[]
    | null;
  const materialRow = Array.isArray(material) ? material[0] : material;
  const unit = materialRow?.unit ?? "other";
  const name = materialRow?.name ?? "Material";

  // No planned quantity: first receipt completes the receive action.
  if (plannedMilli == null || plannedMilli <= 0) {
    if (receivedMilli > 0) {
      await completePendingActionsByReference({
        projectId: input.projectId,
        actionKey: PROJECT_ACTION_KEYS.RECEIVE_MATERIAL,
        referenceId: assignment.id,
        userId: input.userId,
      });
    }
    return;
  }

  if (receivedMilli >= plannedMilli) {
    await completePendingActionsByReference({
      projectId: input.projectId,
      actionKey: PROJECT_ACTION_KEYS.RECEIVE_MATERIAL,
      referenceId: assignment.id,
      userId: input.userId,
    });
    return;
  }

  const remainingMilli = plannedMilli - receivedMilli;
  const remaining = formatQuantityWithUnit(formatMilli(remainingMilli), unit);

  await updatePendingActionDescription({
    projectId: input.projectId,
    actionKey: PROJECT_ACTION_KEYS.RECEIVE_MATERIAL,
    referenceId: assignment.id,
    title: `Receive remaining ${name}`,
    description: `${remaining} still pending receipt.`,
  });
}

export async function createReviewLabourAction(input: {
  businessId: string;
  projectId: string;
  workerCount: number;
}): Promise<void> {
  const user = await getCurrentUser();
  const count = Math.max(1, input.workerCount);

  await upsertPendingProjectAction({
    businessId: input.businessId,
    projectId: input.projectId,
    type: "labour",
    actionKey: PROJECT_ACTION_KEYS.REVIEW_LABOUR,
    title: "Waiting for attendance",
    description:
      count === 1
        ? "1 worker was assigned — mark today's attendance."
        : `${count} workers were assigned — mark today's attendance.`,
    href: labourReviewHref(input.projectId),
    metadata: { worker_count: count },
    createdBy: user?.id ?? null,
    notify: {
      title: "Workers assigned – mark attendance",
      message:
        count === 1
          ? "A worker was assigned and is waiting for attendance."
          : `${count} workers were assigned and are waiting for attendance.`,
      preferenceType: "labour",
    },
  });
}

export async function completeReviewLabourAction(
  projectId: string,
  userId?: string | null,
): Promise<void> {
  await completePendingActionsByKey({
    projectId,
    actionKey: PROJECT_ACTION_KEYS.REVIEW_LABOUR,
    userId,
  });
}

export async function createReviewQuotationAction(input: {
  businessId: string;
  projectId: string;
  quotationId: string;
  quotationNumber: string;
}): Promise<void> {
  const user = await getCurrentUser();

  await upsertPendingProjectAction({
    businessId: input.businessId,
    projectId: input.projectId,
    type: "quotation",
    actionKey: PROJECT_ACTION_KEYS.REVIEW_QUOTATION,
    title: "Quotation needs review",
    description: `Quotation ${input.quotationNumber} was added to this project.`,
    referenceId: input.quotationId,
    href: quotationReviewHref(input.projectId, input.quotationId),
    metadata: { quotation_number: input.quotationNumber },
    createdBy: user?.id ?? null,
    notify: {
      title: "Quotation needs review",
      message: `Quotation ${input.quotationNumber} is ready to review.`,
      preferenceType: "quotation",
    },
  });
}

export async function completeReviewQuotationAction(
  projectId: string,
  quotationId: string,
  userId?: string | null,
): Promise<void> {
  await completePendingActionsByReference({
    projectId,
    actionKey: PROJECT_ACTION_KEYS.REVIEW_QUOTATION,
    referenceId: quotationId,
    userId,
  });
}
