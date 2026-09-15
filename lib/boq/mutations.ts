import { BOQ_ITEM_TYPE_LABELS, mapUnitToBoqUnit } from "@/constants/boq";
import { getCurrentUser } from "@/lib/auth";
import {
  boqActions,
  calculateBoqItem,
  measurementExceedsMessage,
  wouldExceedRemaining,
} from "@/lib/boq/calculations";
import {
  emptyToNull,
  getBoqErrorMessage,
  isUuid,
  type BoqMutationResult,
} from "@/lib/boq/helpers";
import { getBoqById, getBoqItemById } from "@/lib/boq/queries";
import type { BoqItemInput } from "@/lib/boq/types";
import { todayIsoDate } from "@/lib/labour/money";
import { createBusinessNotifications } from "@/lib/notifications/create";
import { getProjectById, getWorkspaceScope } from "@/lib/projects/queries";
import { getQuotationById } from "@/lib/quotations/queries";
import { createClient } from "@/lib/supabase/server";
import { getZodErrorMessage } from "@/lib/validations/error";
import {
  createBoqFromQuotationSchema,
  createBoqItemSchema,
  createBoqSchema,
  createBoqSectionSchema,
  createMeasurementSchema,
  reorderSchema,
  updateBoqSchema,
} from "@/lib/validations/boq";
import type { BoqItemType, BoqUnit, QuotationItemType } from "@/types";

async function assertProjectInWorkspace(
  projectId: string,
): Promise<
  | { ok: true; projectId: string; businessId: string }
  | { ok: false; error: string; status?: number }
> {
  if (!isUuid(projectId)) {
    return { ok: false, error: "Project not found.", status: 404 };
  }

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { ok: false, error: scope.message, status: 401 };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      ok: false,
      error:
        projectResult.error === "not_found"
          ? "Project not found."
          : projectResult.error,
      status: projectResult.error === "not_found" ? 404 : 400,
    };
  }

  if (projectResult.project.business_id !== scope.business.id) {
    return { ok: false, error: "Project not found.", status: 404 };
  }

  return {
    ok: true,
    projectId: projectResult.project.id,
    businessId: scope.business.id,
  };
}

async function assertMaterialInBusiness(
  materialId: string | null,
  businessId: string,
  itemType: BoqItemType,
): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  if (!materialId) {
    return { ok: true };
  }

  if (itemType !== "material") {
    return {
      ok: false,
      error: "Only material items can use a catalog material.",
    };
  }

  if (!isUuid(materialId)) {
    return { ok: false, error: "Select a valid material." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials")
    .select("id")
    .eq("id", materialId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: getBoqErrorMessage(error) };
  }

  if (!data) {
    return {
      ok: false,
      error: "That material was not found in this workspace.",
      status: 400,
    };
  }

  return { ok: true };
}

function toItemInput(values: {
  section_id?: string;
  item_code?: string;
  description: string;
  item_type: BoqItemType;
  material_id?: string;
  unit: BoqUnit;
  estimated_quantity: string;
  rate: string;
  notes?: string;
}): BoqItemInput {
  return {
    section_id: emptyToNull(values.section_id),
    item_code: emptyToNull(values.item_code),
    description: values.description,
    item_type: values.item_type,
    material_id:
      values.item_type === "material" ? emptyToNull(values.material_id) : null,
    unit: values.unit,
    estimated_quantity: values.estimated_quantity,
    rate: values.rate,
    notes: emptyToNull(values.notes),
  };
}

function mapQuotationItemType(type: QuotationItemType): BoqItemType {
  if (type === "material") {
    return "material";
  }

  if (type === "labour") {
    return "labour";
  }

  return "work";
}

export async function createBoq(
  projectId: string,
  values: unknown,
): Promise<BoqMutationResult> {
  const parsed = createBoqSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Check the BOQ details."),
    };
  }

  if (parsed.data.quotation_id) {
    return createBoqFromQuotation(projectId, {
      quotation_id: parsed.data.quotation_id,
      name: parsed.data.name,
      description: parsed.data.description,
    });
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "You must be signed in to continue.", status: 401 };
  }

  const project = await assertProjectInWorkspace(projectId);

  if (!project.ok) {
    return { error: project.error, status: project.status };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boqs")
    .insert({
      business_id: project.businessId,
      project_id: project.projectId,
      name: parsed.data.name,
      description: emptyToNull(parsed.data.description),
      status: "draft",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      error: error ? getBoqErrorMessage(error) : "Unable to create this BOQ.",
    };
  }

  return { success: true, id: data.id };
}

export async function updateBoq(
  projectId: string,
  boqId: string,
  values: unknown,
): Promise<BoqMutationResult> {
  const parsed = updateBoqSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Check the BOQ details."),
    };
  }

  const existing = await getBoqById(projectId, boqId);

  if (existing.error === "not_found" || !existing.boq) {
    return {
      error: existing.error === "not_found" ? "BOQ not found." : existing.error,
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  const actions = boqActions(existing.boq.status);

  if (!actions.edit) {
    return { error: "Only draft or active BOQs can be edited." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boqs")
    .update({
      name: parsed.data.name,
      description: emptyToNull(parsed.data.description),
    })
    .eq("id", boqId)
    .eq("project_id", projectId)
    .eq("business_id", existing.boq.business_id)
    .in("status", ["draft", "active"])
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getBoqErrorMessage(error) };
  }

  if (!data) {
    return { error: "BOQ not found.", status: 404 };
  }

  return { success: true, id: data.id };
}

async function transitionBoqStatus(
  projectId: string,
  boqId: string,
  nextStatus: "active" | "completed" | "archived",
): Promise<BoqMutationResult> {
  const existing = await getBoqById(projectId, boqId);

  if (existing.error === "not_found" || !existing.boq) {
    return {
      error: existing.error === "not_found" ? "BOQ not found." : existing.error,
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  const actions = boqActions(existing.boq.status);

  if (nextStatus === "active" && !actions.activate) {
    return { error: "Only draft BOQs can be activated." };
  }

  if (nextStatus === "completed" && !actions.complete) {
    return { error: "Only active BOQs can be marked completed." };
  }

  if (nextStatus === "archived" && !actions.archive) {
    return { error: "This BOQ is already archived." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boqs")
    .update({ status: nextStatus })
    .eq("id", boqId)
    .eq("project_id", projectId)
    .eq("business_id", existing.boq.business_id)
    .eq("status", existing.boq.status)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getBoqErrorMessage(error) };
  }

  if (!data) {
    return { error: "BOQ not found.", status: 404 };
  }

  return { success: true, id: data.id };
}

export async function activateBoq(projectId: string, boqId: string) {
  return transitionBoqStatus(projectId, boqId, "active");
}

export async function completeBoq(projectId: string, boqId: string) {
  return transitionBoqStatus(projectId, boqId, "completed");
}

export async function archiveBoq(projectId: string, boqId: string) {
  return transitionBoqStatus(projectId, boqId, "archived");
}

export async function duplicateBoq(
  projectId: string,
  boqId: string,
): Promise<BoqMutationResult> {
  const existing = await getBoqById(projectId, boqId);

  if (existing.error === "not_found" || !existing.boq) {
    return {
      error: existing.error === "not_found" ? "BOQ not found." : existing.error,
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "You must be signed in to continue.", status: 401 };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boqs")
    .insert({
      business_id: existing.boq.business_id,
      project_id: existing.boq.project_id,
      name: `${existing.boq.name} copy`,
      description: existing.boq.description,
      status: "draft",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      error: error
        ? getBoqErrorMessage(error)
        : "Unable to duplicate this BOQ.",
    };
  }

  const sectionIdMap = new Map<string, string>();

  if (existing.boq.sections.length > 0) {
    const { data: sectionRows, error: sectionError } = await supabase
      .from("boq_sections")
      .insert(
        existing.boq.sections.map((section) => ({
          boq_id: data.id,
          business_id: existing.boq.business_id,
          name: section.name,
          description: section.description,
          sort_order: section.sort_order,
        })),
      )
      .select("id, name, sort_order");

    if (sectionError || !sectionRows) {
      await supabase.from("boqs").delete().eq("id", data.id);
      return {
        error: sectionError
          ? getBoqErrorMessage(sectionError)
          : "Unable to duplicate BOQ sections.",
      };
    }

    const originals = existing.boq.sections;
    for (const section of originals) {
      const copy = (sectionRows ?? []).find(
        (row) =>
          row.sort_order === section.sort_order && row.name === section.name,
      );
      if (copy) {
        sectionIdMap.set(section.id, copy.id);
      }
    }
  }

  const allItems = [...existing.boq.items, ...existing.boq.unsectioned_items]
    .slice()
    .sort((left, right) => left.sort_order - right.sort_order);

  if (allItems.length > 0) {
    const { error: itemError } = await supabase.from("boq_items").insert(
      allItems.map((item) => ({
        boq_id: data.id,
        section_id: item.section_id
          ? (sectionIdMap.get(item.section_id) ?? null)
          : null,
        business_id: existing.boq.business_id,
        material_id: item.material_id,
        item_code: item.item_code,
        description: item.description,
        item_type: item.item_type,
        unit: item.unit,
        estimated_quantity: item.estimated_quantity,
        rate: item.rate,
        estimated_amount: item.estimated_amount,
        completed_quantity: 0,
        notes: item.notes,
        sort_order: item.sort_order,
      })),
    );

    if (itemError) {
      await supabase.from("boqs").delete().eq("id", data.id);
      return { error: getBoqErrorMessage(itemError) };
    }
  }

  return { success: true, id: data.id };
}

export async function createBoqFromQuotation(
  projectId: string,
  values: unknown,
): Promise<BoqMutationResult> {
  const parsed = createBoqFromQuotationSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Select a valid quotation."),
    };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "You must be signed in to continue.", status: 401 };
  }

  const project = await assertProjectInWorkspace(projectId);

  if (!project.ok) {
    return { error: project.error, status: project.status };
  }

  const quotationResult = await getQuotationById(parsed.data.quotation_id);

  if (quotationResult.error === "not_found" || !quotationResult.quotation) {
    return {
      error:
        quotationResult.error === "not_found"
          ? "Quotation not found."
          : quotationResult.error,
      status: quotationResult.error === "not_found" ? 404 : 400,
    };
  }

  const quotation = quotationResult.quotation;

  if (quotation.business_id !== project.businessId) {
    return { error: "Quotation not found.", status: 404 };
  }

  if (quotation.status !== "accepted") {
    return { error: "Only accepted quotations can be copied into a BOQ." };
  }

  if (quotation.project_id && quotation.project_id !== project.projectId) {
    return {
      error: "That quotation is linked to a different project.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boqs")
    .insert({
      business_id: project.businessId,
      project_id: project.projectId,
      name: parsed.data.name?.trim() || `${quotation.title} BOQ`,
      description:
        emptyToNull(parsed.data.description) ??
        `Copied from quotation ${quotation.quotation_number}. This BOQ is independent of the quotation.`,
      status: "draft",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      error: error
        ? getBoqErrorMessage(error)
        : "Unable to create a BOQ from this quotation.",
    };
  }

  const grouped = new Map<BoqItemType, typeof quotation.items>();

  for (const item of quotation.items) {
    const type = mapQuotationItemType(item.item_type);
    const list = grouped.get(type) ?? [];
    list.push(item);
    grouped.set(type, list);
  }

  const sectionOrder: BoqItemType[] = ["work", "material", "labour", "other"];
  const sectionIdByType = new Map<BoqItemType, string>();
  let sortOrder = 0;

  for (const type of sectionOrder) {
    if (!grouped.has(type)) {
      continue;
    }

    const { data: section, error: sectionError } = await supabase
      .from("boq_sections")
      .insert({
        boq_id: data.id,
        business_id: project.businessId,
        name: BOQ_ITEM_TYPE_LABELS[type],
        sort_order: sortOrder,
      })
      .select("id")
      .single();

    if (sectionError || !section) {
      await supabase.from("boqs").delete().eq("id", data.id);
      return {
        error: sectionError
          ? getBoqErrorMessage(sectionError)
          : "Unable to copy quotation sections.",
      };
    }

    sectionIdByType.set(type, section.id);
    sortOrder += 1;
  }

  const itemRows = quotation.items.map((item, index) => {
    const type = mapQuotationItemType(item.item_type);
    const calculated = calculateBoqItem(
      {
        section_id: sectionIdByType.get(type) ?? null,
        item_code: null,
        description: item.description,
        item_type: type,
        material_id: type === "material" ? item.material_id : null,
        unit: mapUnitToBoqUnit(item.unit),
        estimated_quantity: String(item.quantity),
        rate: String(item.unit_price),
        notes: item.notes,
      },
      index,
    );

    if ("error" in calculated) {
      return calculated;
    }

    return {
      boq_id: data.id,
      section_id: calculated.section_id,
      business_id: project.businessId,
      material_id: calculated.material_id,
      item_code: calculated.item_code,
      description: calculated.description,
      item_type: calculated.item_type,
      unit: calculated.unit,
      estimated_quantity: calculated.estimated_quantity,
      rate: calculated.rate,
      estimated_amount: calculated.estimated_amount,
      completed_quantity: 0,
      notes: calculated.notes,
      sort_order: calculated.sort_order,
    };
  });

  const failed = itemRows.find((row) => "error" in row);

  if (failed && "error" in failed) {
    await supabase.from("boqs").delete().eq("id", data.id);
    return { error: failed.error };
  }

  if (itemRows.length > 0) {
    const { error: itemError } = await supabase
      .from("boq_items")
      .insert(
        itemRows.filter(
          (row): row is Exclude<typeof row, { error: string }> =>
            !("error" in row),
        ),
      );

    if (itemError) {
      await supabase.from("boqs").delete().eq("id", data.id);
      return { error: getBoqErrorMessage(itemError) };
    }
  }

  return { success: true, id: data.id };
}

export async function createBoqSection(
  projectId: string,
  boqId: string,
  values: unknown,
): Promise<BoqMutationResult> {
  const parsed = createBoqSectionSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Check the section details."),
    };
  }

  const existing = await getBoqById(projectId, boqId);

  if (existing.error === "not_found" || !existing.boq) {
    return {
      error: existing.error === "not_found" ? "BOQ not found." : existing.error,
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  if (!boqActions(existing.boq.status).edit) {
    return { error: "Only draft or active BOQs can change sections." };
  }

  const nextOrder =
    existing.boq.sections.reduce(
      (max, section) => Math.max(max, section.sort_order),
      -1,
    ) + 1;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boq_sections")
    .insert({
      boq_id: boqId,
      business_id: existing.boq.business_id,
      name: parsed.data.name,
      description: emptyToNull(parsed.data.description),
      sort_order: nextOrder,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      error: error ? getBoqErrorMessage(error) : "Unable to add this section.",
    };
  }

  return { success: true, id: data.id };
}

export async function updateBoqSection(
  projectId: string,
  boqId: string,
  sectionId: string,
  values: unknown,
): Promise<BoqMutationResult> {
  const parsed = createBoqSectionSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Check the section details."),
    };
  }

  const existing = await getBoqById(projectId, boqId);

  if (existing.error === "not_found" || !existing.boq) {
    return {
      error: existing.error === "not_found" ? "BOQ not found." : existing.error,
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  if (!boqActions(existing.boq.status).edit) {
    return { error: "Only draft or active BOQs can change sections." };
  }

  const section = existing.boq.sections.find((row) => row.id === sectionId);

  if (!section) {
    return { error: "Section not found.", status: 404 };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boq_sections")
    .update({
      name: parsed.data.name,
      description: emptyToNull(parsed.data.description),
    })
    .eq("id", sectionId)
    .eq("boq_id", boqId)
    .eq("business_id", existing.boq.business_id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getBoqErrorMessage(error) };
  }

  if (!data) {
    return { error: "Section not found.", status: 404 };
  }

  return { success: true, id: data.id };
}

export async function deleteBoqSection(
  projectId: string,
  boqId: string,
  sectionId: string,
): Promise<BoqMutationResult> {
  const existing = await getBoqById(projectId, boqId);

  if (existing.error === "not_found" || !existing.boq) {
    return {
      error: existing.error === "not_found" ? "BOQ not found." : existing.error,
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  if (!boqActions(existing.boq.status).edit) {
    return { error: "Only draft or active BOQs can change sections." };
  }

  const section = existing.boq.sections.find((row) => row.id === sectionId);

  if (!section) {
    return { error: "Section not found.", status: 404 };
  }

  if (section.item_count > 0) {
    return {
      error: "Remove or move the items in this section before deleting it.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("boq_sections")
    .delete()
    .eq("id", sectionId)
    .eq("boq_id", boqId)
    .eq("business_id", existing.boq.business_id);

  if (error) {
    return { error: getBoqErrorMessage(error) };
  }

  return { success: true, id: sectionId };
}

export async function reorderBoqSections(
  projectId: string,
  boqId: string,
  values: unknown,
): Promise<BoqMutationResult> {
  const parsed = reorderSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Select sections to reorder."),
    };
  }

  const existing = await getBoqById(projectId, boqId);

  if (existing.error === "not_found" || !existing.boq) {
    return {
      error: existing.error === "not_found" ? "BOQ not found." : existing.error,
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  if (!boqActions(existing.boq.status).edit) {
    return { error: "Only draft or active BOQs can change sections." };
  }

  const currentIds = new Set(
    existing.boq.sections.map((section) => section.id),
  );

  if (
    parsed.data.ids.length !== currentIds.size ||
    parsed.data.ids.some((id) => !currentIds.has(id))
  ) {
    return { error: "Section order does not match this BOQ." };
  }

  const supabase = await createClient();

  for (const [index, id] of parsed.data.ids.entries()) {
    const { error } = await supabase
      .from("boq_sections")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("boq_id", boqId)
      .eq("business_id", existing.boq.business_id);

    if (error) {
      return { error: getBoqErrorMessage(error) };
    }
  }

  return { success: true, id: boqId };
}

export async function createBoqItem(
  projectId: string,
  boqId: string,
  values: unknown,
): Promise<BoqMutationResult> {
  const parsed = createBoqItemSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Check the item details."),
    };
  }

  const existing = await getBoqById(projectId, boqId);

  if (existing.error === "not_found" || !existing.boq) {
    return {
      error: existing.error === "not_found" ? "BOQ not found." : existing.error,
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  if (!boqActions(existing.boq.status).edit) {
    return { error: "Only draft or active BOQs can change items." };
  }

  const input = toItemInput(parsed.data);
  const sectionId = input.section_id;

  if (
    sectionId &&
    !existing.boq.sections.some((section) => section.id === sectionId)
  ) {
    return { error: "Section not found.", status: 404 };
  }

  const materialCheck = await assertMaterialInBusiness(
    input.material_id,
    existing.boq.business_id,
    input.item_type,
  );

  if (!materialCheck.ok) {
    return { error: materialCheck.error, status: materialCheck.status };
  }

  const section = sectionId
    ? (existing.boq.sections.find((row) => row.id === sectionId) ?? null)
    : null;

  const siblings = [...existing.boq.items, ...existing.boq.unsectioned_items]
    .filter((item) => (item.section_id ?? null) === sectionId)
    .map((item) => item.sort_order);
  const nextOrder = siblings.length > 0 ? Math.max(...siblings) + 1 : 0;
  const existingCodes = [
    ...existing.boq.items,
    ...existing.boq.unsectioned_items,
  ]
    .filter((item) => (item.section_id ?? null) === sectionId)
    .map((item) => item.item_code)
    .filter((code): code is string => Boolean(code));
  const calculated = calculateBoqItem(
    input,
    nextOrder,
    section?.name,
    existingCodes,
  );

  if ("error" in calculated) {
    return { error: calculated.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boq_items")
    .insert({
      boq_id: boqId,
      section_id: calculated.section_id,
      business_id: existing.boq.business_id,
      material_id: calculated.material_id,
      item_code: calculated.item_code,
      description: calculated.description,
      item_type: calculated.item_type,
      unit: calculated.unit,
      estimated_quantity: calculated.estimated_quantity,
      rate: calculated.rate,
      estimated_amount: calculated.estimated_amount,
      completed_quantity: 0,
      notes: calculated.notes,
      sort_order: calculated.sort_order,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      error: error ? getBoqErrorMessage(error) : "Unable to add this item.",
    };
  }

  return { success: true, id: data.id };
}

export async function updateBoqItem(
  projectId: string,
  boqId: string,
  itemId: string,
  values: unknown,
): Promise<BoqMutationResult> {
  const parsed = createBoqItemSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Check the item details."),
    };
  }

  const existing = await getBoqItemById(projectId, boqId, itemId);

  if (existing.error === "not_found" || !existing.result) {
    return {
      error:
        existing.error === "not_found" ? "BOQ item not found." : existing.error,
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  if (!boqActions(existing.result.boq.status).edit) {
    return { error: "Only draft or active BOQs can change items." };
  }

  const input = toItemInput(parsed.data);
  const sectionId = input.section_id;

  if (
    sectionId &&
    !existing.result.boq.sections.some((section) => section.id === sectionId)
  ) {
    return { error: "Section not found.", status: 404 };
  }

  const materialCheck = await assertMaterialInBusiness(
    input.material_id,
    existing.result.boq.business_id,
    input.item_type,
  );

  if (!materialCheck.ok) {
    return { error: materialCheck.error, status: materialCheck.status };
  }

  const section = sectionId
    ? (existing.result.boq.sections.find((row) => row.id === sectionId) ?? null)
    : null;
  const existingCodes = [
    ...existing.result.boq.items,
    ...existing.result.boq.unsectioned_items,
  ]
    .filter((item) => item.id !== itemId)
    .filter((item) => (item.section_id ?? null) === sectionId)
    .map((item) => item.item_code)
    .filter((code): code is string => Boolean(code));
  const calculated = calculateBoqItem(
    input,
    existing.result.item.sort_order,
    section?.name,
    existingCodes,
  );

  if ("error" in calculated) {
    return { error: calculated.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boq_items")
    .update({
      section_id: calculated.section_id,
      material_id: calculated.material_id,
      item_code: calculated.item_code,
      description: calculated.description,
      item_type: calculated.item_type,
      unit: calculated.unit,
      estimated_quantity: calculated.estimated_quantity,
      rate: calculated.rate,
      estimated_amount: calculated.estimated_amount,
      notes: calculated.notes,
    })
    .eq("id", itemId)
    .eq("boq_id", boqId)
    .eq("business_id", existing.result.boq.business_id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getBoqErrorMessage(error) };
  }

  if (!data) {
    return { error: "BOQ item not found.", status: 404 };
  }

  return { success: true, id: data.id };
}

export async function deleteBoqItem(
  projectId: string,
  boqId: string,
  itemId: string,
): Promise<BoqMutationResult> {
  const existing = await getBoqItemById(projectId, boqId, itemId);

  if (existing.error === "not_found" || !existing.result) {
    return {
      error:
        existing.error === "not_found" ? "BOQ item not found." : existing.error,
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  if (!boqActions(existing.result.boq.status).edit) {
    return { error: "Only draft or active BOQs can change items." };
  }

  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("boq_measurements")
    .select("id", { count: "exact", head: true })
    .eq("boq_item_id", itemId)
    .eq("business_id", existing.result.boq.business_id);

  if (countError) {
    return { error: getBoqErrorMessage(countError) };
  }

  if ((count ?? 0) > 0) {
    return {
      error: "This item has measurement history and cannot be deleted.",
    };
  }

  const { error } = await supabase
    .from("boq_items")
    .delete()
    .eq("id", itemId)
    .eq("boq_id", boqId)
    .eq("business_id", existing.result.boq.business_id);

  if (error) {
    return { error: getBoqErrorMessage(error) };
  }

  return { success: true, id: itemId };
}

export async function reorderBoqItems(
  projectId: string,
  boqId: string,
  values: unknown,
): Promise<BoqMutationResult> {
  const parsed = reorderSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Select items to reorder."),
    };
  }

  const existing = await getBoqById(projectId, boqId);

  if (existing.error === "not_found" || !existing.boq) {
    return {
      error: existing.error === "not_found" ? "BOQ not found." : existing.error,
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  if (!boqActions(existing.boq.status).edit) {
    return { error: "Only draft or active BOQs can change items." };
  }

  const currentIds = new Set(
    [...existing.boq.items, ...existing.boq.unsectioned_items].map(
      (item) => item.id,
    ),
  );

  if (parsed.data.ids.some((id) => !currentIds.has(id))) {
    return { error: "Item order does not match this BOQ." };
  }

  const supabase = await createClient();

  for (const [index, id] of parsed.data.ids.entries()) {
    const { error } = await supabase
      .from("boq_items")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("boq_id", boqId)
      .eq("business_id", existing.boq.business_id);

    if (error) {
      return { error: getBoqErrorMessage(error) };
    }
  }

  return { success: true, id: boqId };
}

export async function createBoqMeasurement(
  projectId: string,
  boqId: string,
  itemId: string,
  values: unknown,
): Promise<BoqMutationResult> {
  const parsed = createMeasurementSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Check the measurement details."),
    };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "You must be signed in to continue.", status: 401 };
  }

  const existing = await getBoqItemById(projectId, boqId, itemId);

  if (existing.error === "not_found" || !existing.result) {
    return {
      error:
        existing.error === "not_found" ? "BOQ item not found." : existing.error,
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  if (!boqActions(existing.result.boq.status).measure) {
    return { error: "Measurements can only be added to draft or active BOQs." };
  }

  if (parsed.data.unit !== existing.result.item.unit) {
    return { error: "Measurement unit must match the BOQ item unit." };
  }

  if (parsed.data.measurement_date > todayIsoDate()) {
    return { error: "Measurement date cannot be in the future." };
  }

  const overrun = wouldExceedRemaining(
    existing.result.item.estimated_quantity,
    existing.result.item.completed_quantity,
    parsed.data.quantity,
  );

  if (overrun.exceeds) {
    return { error: measurementExceedsMessage(overrun.remaining) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boq_measurements")
    .insert({
      business_id: existing.result.boq.business_id,
      project_id: existing.result.boq.project_id,
      boq_id: existing.result.boq.id,
      boq_item_id: existing.result.item.id,
      measurement_date: parsed.data.measurement_date,
      description: emptyToNull(parsed.data.description),
      quantity: parsed.data.quantity,
      unit: existing.result.item.unit,
      location: emptyToNull(parsed.data.location),
      reference: emptyToNull(parsed.data.reference),
      notes: emptyToNull(parsed.data.notes),
      status: "active",
      measured_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      error: error
        ? getBoqErrorMessage(error)
        : "Unable to save this measurement.",
    };
  }

  void createBusinessNotifications({
    businessId: existing.result.boq.business_id,
    projectId: existing.result.boq.project_id,
    type: "boq",
    title: "BOQ measurement recorded",
    message: `A measurement was recorded on ${existing.result.boq.name}.`,
    actionUrl: `/projects/${existing.result.boq.project_id}/boq/${existing.result.boq.id}/items/${existing.result.item.id}`,
    dedupeKey: `boq_measurement:${data.id}`,
    preferenceKey: "boq_notifications",
  });

  return { success: true, id: data.id };
}

export async function voidBoqMeasurement(
  projectId: string,
  boqId: string,
  itemId: string,
  measurementId: string,
): Promise<BoqMutationResult> {
  if (!isUuid(measurementId)) {
    return { error: "Measurement not found.", status: 404 };
  }

  const existing = await getBoqItemById(projectId, boqId, itemId);

  if (existing.error === "not_found" || !existing.result) {
    return {
      error:
        existing.error === "not_found" ? "BOQ item not found." : existing.error,
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  if (!boqActions(existing.result.boq.status).measure) {
    return {
      error: "Measurements can only be voided on draft or active BOQs.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boq_measurements")
    .update({ status: "void" })
    .eq("id", measurementId)
    .eq("project_id", projectId)
    .eq("boq_id", boqId)
    .eq("boq_item_id", itemId)
    .eq("business_id", existing.result.boq.business_id)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getBoqErrorMessage(error) };
  }

  if (!data) {
    return { error: "Measurement not found.", status: 404 };
  }

  return { success: true, id: data.id };
}
