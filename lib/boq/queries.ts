import { cache } from "react";
import {
  isBoqCompletionStatus,
  isBoqItemType,
  isBoqStatus,
} from "@/constants/boq";
import {
  paginationMeta,
  parsePagination,
  type Pagination,
} from "@/lib/api/pagination";
import {
  buildBoqSummary,
  buildItemProgress,
  differenceAmount,
  matchesItemFilters,
} from "@/lib/boq/calculations";
import {
  getBoqErrorMessage,
  isUuid,
  sanitizeSearchTerm,
} from "@/lib/boq/helpers";
import type {
  BoqDashboard,
  BoqDetail,
  BoqFilters,
  BoqItemDetail,
  BoqItemFilters,
  BoqItemProgress,
  BoqListItem,
  BoqListResult,
  BoqMeasurementListResult,
  BoqSectionSummary,
  BoqSummary,
  EstimateVsActual,
  MeasurementSummary,
} from "@/lib/boq/types";
import { getProjectCostTotals } from "@/lib/costs/queries";
import { formatPaise, parseMoneyToPaise } from "@/lib/labour/money";
import { getProjectById } from "@/lib/projects/queries";
import { getLatestAcceptedQuotationForProject } from "@/lib/quotations/queries";
import { createClient } from "@/lib/supabase/server";
import type {
  Boq,
  BoqItem,
  BoqMeasurement,
  BoqSection,
} from "@/types";

type BoqSummaryRow = {
  boq_id: string;
  item_count: number | string;
  estimated_value: number | string;
  completed_value: number | string;
};

function toCount(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function moneyFromUnknown(value: number | string | null | undefined): string {
  if (value == null || value === "") {
    return "0.00";
  }

  const paise = parseMoneyToPaise(value);
  return paise == null ? "0.00" : formatPaise(paise);
}

function emptySummary(): BoqSummary {
  return {
    item_count: 0,
    estimated_quantity: "0",
    estimated_value: "0.00",
    completed_value: "0.00",
    remaining_value: "0.00",
    completion_percentage: null,
  };
}

function summaryFromRow(row: BoqSummaryRow | undefined): BoqSummary {
  if (!row) {
    return emptySummary();
  }

  const estimated = moneyFromUnknown(row.estimated_value);
  const completed = moneyFromUnknown(row.completed_value);
  const estimatedPaise = parseMoneyToPaise(estimated) ?? 0;
  const completedPaise = parseMoneyToPaise(completed) ?? 0;

  return {
    item_count: toCount(row.item_count),
    estimated_quantity: "0",
    estimated_value: estimated,
    completed_value: completed,
    remaining_value: formatPaise(Math.max(0, estimatedPaise - completedPaise)),
    completion_percentage:
      estimatedPaise <= 0
        ? null
        : Math.round((completedPaise / estimatedPaise) * 1000) / 10,
  };
}

async function loadCreatorNames(
  userIds: string[],
): Promise<Map<string, string | null>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const names = new Map<string, string | null>();

  if (uniqueIds.length === 0) {
    return names;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", uniqueIds);

  if (error || !data) {
    return names;
  }

  for (const profile of data) {
    names.set(profile.id, profile.full_name);
  }

  return names;
}

export function parseBoqSearchParams(searchParams: {
  q?: string;
  status?: string;
}): BoqFilters {
  const status = searchParams.status;

  return {
    query: searchParams.q?.trim() || undefined,
    status:
      status === "all"
        ? "all"
        : status && isBoqStatus(status)
          ? status
          : undefined,
  };
}

export function parseBoqItemSearchParams(searchParams: {
  q?: string;
  section_id?: string;
  item_type?: string;
  completion?: string;
}): BoqItemFilters {
  return {
    query: searchParams.q?.trim() || undefined,
    sectionId:
      searchParams.section_id && isUuid(searchParams.section_id)
        ? searchParams.section_id
        : undefined,
    itemType:
      searchParams.item_type === "all"
        ? "all"
        : searchParams.item_type && isBoqItemType(searchParams.item_type)
          ? searchParams.item_type
          : undefined,
    completion:
      searchParams.completion === "all"
        ? "all"
        : searchParams.completion &&
            isBoqCompletionStatus(searchParams.completion)
          ? searchParams.completion
          : undefined,
  };
}

async function assertProject(
  projectId: string,
): Promise<
  | { ok: true; projectId: string; businessId: string }
  | { ok: false; error: "not_found" | string }
> {
  if (!isUuid(projectId)) {
    return { ok: false, error: "not_found" };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      ok: false,
      error:
        projectResult.error === "not_found"
          ? "not_found"
          : projectResult.error,
    };
  }

  return {
    ok: true,
    projectId: projectResult.project.id,
    businessId: projectResult.project.business_id,
  };
}

function mapItemProgress(
  item: BoqItem,
  sectionName: string | null,
  materialName: string | null,
): BoqItemProgress {
  return {
    ...buildItemProgress(item),
    section_name: sectionName,
    material_name: materialName,
  };
}

function mapSectionSummaries(
  sections: BoqSection[],
  items: BoqItemProgress[],
): BoqSectionSummary[] {
  return sections
    .slice()
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((section) => {
      const sectionItems = items.filter((item) => item.section_id === section.id);
      return {
        ...section,
        ...buildBoqSummary(sectionItems),
      };
    });
}

async function loadEstimateVsActual(
  projectId: string,
  boqEstimatedValue: string,
): Promise<EstimateVsActual | null> {
  const [costResult, quotationResult] = await Promise.all([
    getProjectCostTotals(projectId),
    getLatestAcceptedQuotationForProject(projectId),
  ]);

  if (costResult.error === "not_found") {
    return null;
  }

  if (costResult.error || !costResult.totals) {
    return null;
  }

  const actual = costResult.totals.total_cost;
  const quotation =
    quotationResult.error || !quotationResult.quotation
      ? null
      : quotationResult.quotation;

  return {
    quotation_value: quotation?.total_amount ?? null,
    quotation_number: quotation?.quotation_number ?? null,
    boq_estimated_value: boqEstimatedValue,
    actual_cost: actual,
    difference: differenceAmount(boqEstimatedValue, actual),
  };
}

async function loadBoqSummaries(
  projectId: string,
): Promise<Map<string, BoqSummary>> {
  const summaries = new Map<string, BoqSummary>();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("boq_summaries", {
    target_project_id: projectId,
  });

  if (error || !data) {
    return summaries;
  }

  for (const row of data as BoqSummaryRow[]) {
    summaries.set(row.boq_id, summaryFromRow(row));
  }

  return summaries;
}

export async function getProjectBoqs(
  projectId: string,
  filters: BoqFilters = {},
  pagination: Pagination = parsePagination({}),
): Promise<
  | { result: BoqListResult; error: null }
  | { result: null; error: "not_found" }
  | { result: null; error: string }
> {
  const project = await assertProject(projectId);

  if (!project.ok) {
    return { result: null, error: project.error };
  }

  const supabase = await createClient();
  let query = supabase
    .from("boqs")
    .select("*", { count: "exact" })
    .eq("project_id", project.projectId)
    .eq("business_id", project.businessId)
    .order("created_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const search = filters.query ? sanitizeSearchTerm(filters.query) : "";

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const { data, error, count } = await query.range(
    pagination.from,
    pagination.to,
  );

  if (error) {
    return { result: null, error: getBoqErrorMessage(error) };
  }

  const summaries = await loadBoqSummaries(project.projectId);
  const boqs: BoqListItem[] = ((data ?? []) as Boq[]).map((boq) => ({
    ...boq,
    summary: summaries.get(boq.id) ?? emptySummary(),
  }));

  const dashboard = await loadProjectBoqDashboard(
    project.projectId,
    project.businessId,
    summaries,
  );

  return {
    result: {
      boqs,
      dashboard,
      ...paginationMeta(pagination.page, pagination.pageSize, count ?? 0),
    },
    error: null,
  };
}

async function loadRecentMeasurements(
  projectId: string,
  businessId: string,
  boqId?: string,
): Promise<MeasurementSummary[]> {
  const supabase = await createClient();
  let query = supabase
    .from("boq_measurements")
    .select("*")
    .eq("project_id", projectId)
    .eq("business_id", businessId)
    .eq("status", "active")
    .order("measurement_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(8);

  if (boqId) {
    query = query.eq("boq_id", boqId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return hydrateMeasurements(data as BoqMeasurement[], businessId);
}

async function hydrateMeasurements(
  rows: BoqMeasurement[],
  businessId: string,
): Promise<MeasurementSummary[]> {
  if (rows.length === 0) {
    return [];
  }

  const itemIds = [...new Set(rows.map((row) => row.boq_item_id))];
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("boq_items")
    .select("id, description, item_code, section_id")
    .eq("business_id", businessId)
    .in("id", itemIds);

  const sectionIds = [
    ...new Set(
      (items ?? [])
        .map((item) => item.section_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const { data: sections } =
    sectionIds.length > 0
      ? await supabase
          .from("boq_sections")
          .select("id, name")
          .eq("business_id", businessId)
          .in("id", sectionIds)
      : { data: [] };

  const names = await loadCreatorNames(rows.map((row) => row.measured_by));
  const itemMap = new Map(
    (items ?? []).map((item) => [
      item.id,
      {
        description: item.description,
        item_code: item.item_code,
        section_id: item.section_id,
      },
    ]),
  );
  const sectionMap = new Map(
    (sections ?? []).map((section) => [section.id, section.name]),
  );

  return rows.map((row) => {
    const item = itemMap.get(row.boq_item_id);

    return {
      ...row,
      item_description: item?.description ?? "BOQ item",
      item_code: item?.item_code ?? null,
      section_name: item?.section_id
        ? (sectionMap.get(item.section_id) ?? null)
        : null,
      measured_by_name: names.get(row.measured_by) ?? null,
    };
  });
}

async function loadProjectBoqDashboard(
  projectId: string,
  businessId: string,
  summaries: Map<string, BoqSummary>,
): Promise<BoqDashboard> {
  const supabase = await createClient();
  const { data: boqRows } = await supabase
    .from("boqs")
    .select("*")
    .eq("project_id", projectId)
    .eq("business_id", businessId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const boqs = (boqRows ?? []) as Boq[];
  const focusBoq =
    boqs.find((boq) => boq.status === "active") ??
    boqs.find((boq) => boq.status === "draft") ??
    boqs[0] ??
    null;

  if (!focusBoq) {
    const totals = Array.from(summaries.values());
    const combined = totals.reduce(
      (acc, summary) => {
        const estimated =
          (parseMoneyToPaise(acc.estimated_value) ?? 0) +
          (parseMoneyToPaise(summary.estimated_value) ?? 0);
        const completed =
          (parseMoneyToPaise(acc.completed_value) ?? 0) +
          (parseMoneyToPaise(summary.completed_value) ?? 0);

        return {
          item_count: acc.item_count + summary.item_count,
          estimated_quantity: acc.estimated_quantity,
          estimated_value: formatPaise(estimated),
          completed_value: formatPaise(completed),
          remaining_value: formatPaise(Math.max(0, estimated - completed)),
          completion_percentage:
            estimated <= 0
              ? null
              : Math.round((completed / estimated) * 1000) / 10,
        };
      },
      emptySummary(),
    );

    return {
      summary: combined,
      estimate_vs_actual: await loadEstimateVsActual(
        projectId,
        combined.estimated_value,
      ),
      top_completed_sections: [],
      remaining_sections: [],
      recent_measurements: await loadRecentMeasurements(projectId, businessId),
    };
  }

  const detail = await loadBoqDetailRecords(focusBoq, businessId);
  const sectionSummaries = mapSectionSummaries(detail.sections, detail.items);
  const withProgress = sectionSummaries.filter(
    (section) => (section.completion_percentage ?? 0) > 0,
  );
  const remaining = sectionSummaries.filter((section) => {
    const remainingPaise = parseMoneyToPaise(section.remaining_value) ?? 0;
    return remainingPaise > 0;
  });

  return {
    summary: detail.summary,
    estimate_vs_actual: await loadEstimateVsActual(
      projectId,
      detail.summary.estimated_value,
    ),
    top_completed_sections: withProgress
      .slice()
      .sort(
        (left, right) =>
          (right.completion_percentage ?? 0) -
          (left.completion_percentage ?? 0),
      )
      .slice(0, 4),
    remaining_sections: remaining
      .slice()
      .sort(
        (left, right) =>
          (parseMoneyToPaise(right.remaining_value) ?? 0) -
          (parseMoneyToPaise(left.remaining_value) ?? 0),
      )
      .slice(0, 4),
    recent_measurements: await loadRecentMeasurements(
      projectId,
      businessId,
      focusBoq.id,
    ),
  };
}

async function loadBoqDetailRecords(
  boq: Boq,
  businessId: string,
): Promise<{
  sections: BoqSection[];
  items: BoqItemProgress[];
  summary: BoqSummary;
}> {
  const supabase = await createClient();
  const [{ data: sectionRows, error: sectionError }, { data: itemRows, error: itemError }] =
    await Promise.all([
      supabase
        .from("boq_sections")
        .select("*")
        .eq("boq_id", boq.id)
        .eq("business_id", businessId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("boq_items")
        .select("*")
        .eq("boq_id", boq.id)
        .eq("business_id", businessId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

  if (sectionError) {
    throw new Error(getBoqErrorMessage(sectionError));
  }

  if (itemError) {
    throw new Error(getBoqErrorMessage(itemError));
  }

  const sections = (sectionRows ?? []) as BoqSection[];
  const items = (itemRows ?? []) as BoqItem[];
  const sectionNames = new Map(sections.map((section) => [section.id, section.name]));
  const materialIds = [
    ...new Set(
      items
        .map((item) => item.material_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const materialNames = new Map<string, string>();

  if (materialIds.length > 0) {
    const { data: materials } = await supabase
      .from("materials")
      .select("id, name")
      .eq("business_id", businessId)
      .in("id", materialIds);

    for (const material of materials ?? []) {
      materialNames.set(material.id, material.name);
    }
  }

  const progressItems = items.map((item) =>
    mapItemProgress(
      item,
      item.section_id ? (sectionNames.get(item.section_id) ?? null) : null,
      item.material_id ? (materialNames.get(item.material_id) ?? null) : null,
    ),
  );

  return {
    sections,
    items: progressItems,
    summary: buildBoqSummary(progressItems),
  };
}

export async function loadBoqById(
  projectId: string,
  boqId: string,
): Promise<
  | { boq: BoqDetail; error: null }
  | { boq: null; error: "not_found" }
  | { boq: null; error: string }
> {
  if (!isUuid(projectId) || !isUuid(boqId)) {
    return { boq: null, error: "not_found" };
  }

  const project = await assertProject(projectId);

  if (!project.ok) {
    return { boq: null, error: project.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boqs")
    .select("*")
    .eq("id", boqId)
    .eq("project_id", project.projectId)
    .eq("business_id", project.businessId)
    .maybeSingle();

  if (error) {
    return { boq: null, error: getBoqErrorMessage(error) };
  }

  if (!data) {
    return { boq: null, error: "not_found" };
  }

  try {
    const records = await loadBoqDetailRecords(data, project.businessId);
    const names = await loadCreatorNames([data.created_by]);
    const sectionSummaries = mapSectionSummaries(
      records.sections,
      records.items,
    );

    return {
      boq: {
        ...data,
        sections: sectionSummaries,
        items: records.items.filter((item) => item.section_id),
        unsectioned_items: records.items.filter((item) => !item.section_id),
        summary: records.summary,
        created_by_name: names.get(data.created_by) ?? null,
        estimate_vs_actual: await loadEstimateVsActual(
          project.projectId,
          records.summary.estimated_value,
        ),
      },
      error: null,
    };
  } catch (caught) {
    return {
      boq: null,
      error:
        caught instanceof Error
          ? caught.message
          : "Unable to load this BOQ.",
    };
  }
}

export const getBoqById = cache(loadBoqById);

export async function loadBoqItemById(
  projectId: string,
  boqId: string,
  itemId: string,
): Promise<
  | { result: BoqItemDetail; error: null }
  | { result: null; error: "not_found" }
  | { result: null; error: string }
> {
  if (!isUuid(projectId) || !isUuid(boqId) || !isUuid(itemId)) {
    return { result: null, error: "not_found" };
  }

  const boqResult = await getBoqById(projectId, boqId);

  if (boqResult.error === "not_found" || !boqResult.boq) {
    return {
      result: null,
      error:
        boqResult.error === "not_found" ? "not_found" : boqResult.error,
    };
  }

  const item =
    boqResult.boq.items.find((row) => row.id === itemId) ??
    boqResult.boq.unsectioned_items.find((row) => row.id === itemId);

  if (!item) {
    return { result: null, error: "not_found" };
  }

  const section =
    boqResult.boq.sections.find((row) => row.id === item.section_id) ?? null;

  return {
    result: {
      boq: boqResult.boq,
      item,
      section,
    },
    error: null,
  };
}

export const getBoqItemById = cache(loadBoqItemById);

export async function getBoqMeasurements(
  projectId: string,
  boqId: string,
  itemId: string,
  pagination: Pagination = parsePagination({}),
): Promise<
  | { result: BoqMeasurementListResult; error: null }
  | { result: null; error: "not_found" }
  | { result: null; error: string }
> {
  const itemResult = await getBoqItemById(projectId, boqId, itemId);

  if (itemResult.error === "not_found" || !itemResult.result) {
    return {
      result: null,
      error:
        itemResult.error === "not_found" ? "not_found" : itemResult.error,
    };
  }

  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("boq_measurements")
    .select("*", { count: "exact" })
    .eq("project_id", projectId)
    .eq("boq_id", boqId)
    .eq("boq_item_id", itemId)
    .eq("business_id", itemResult.result.boq.business_id)
    .order("measurement_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(pagination.from, pagination.to);

  if (error) {
    return { result: null, error: getBoqErrorMessage(error) };
  }

  const measurements = await hydrateMeasurements(
    (data ?? []) as BoqMeasurement[],
    itemResult.result.boq.business_id,
  );

  const activeQuantity = itemResult.result.item.completed_quantity;

  return {
    result: {
      measurements,
      total_quantity: activeQuantity,
      ...paginationMeta(pagination.page, pagination.pageSize, count ?? 0),
    },
    error: null,
  };
}

export function filterBoqItems(
  boq: BoqDetail,
  filters: BoqItemFilters,
): BoqItemProgress[] {
  return [...boq.items, ...boq.unsectioned_items].filter((item) =>
    matchesItemFilters(item, filters),
  );
}

export async function getAcceptedProjectQuotations(projectId: string): Promise<
  | {
      quotations: Array<{ id: string; quotation_number: string; title: string; total_amount: string }>;
      error: null;
    }
  | { quotations: []; error: "not_found" }
  | { quotations: []; error: string }
> {
  const project = await assertProject(projectId);

  if (!project.ok) {
    return { quotations: [], error: project.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotations")
    .select("id, quotation_number, title, total_amount, project_id")
    .eq("business_id", project.businessId)
    .eq("status", "accepted")
    .or(`project_id.eq.${project.projectId},project_id.is.null`)
    .order("quotation_date", { ascending: false });

  if (error) {
    return { quotations: [], error: getBoqErrorMessage(error) };
  }

  return {
    quotations: (data ?? []).map((row) => ({
      id: row.id,
      quotation_number: row.quotation_number,
      title: row.title,
      total_amount: row.total_amount,
    })),
    error: null,
  };
}
