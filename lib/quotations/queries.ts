import { cache } from "react";
import { isQuotationStatus } from "@/constants/quotation";
import {
  paginationMeta,
  parsePagination,
  type Pagination,
} from "@/lib/api/pagination";
import { getProjectCostTotals } from "@/lib/costs/queries";
import { formatPaise, isIsoDate, todayIsoDate } from "@/lib/labour/money";
import { moneyToPaise } from "@/lib/costs/calculations";
import { getProjectById, getWorkspaceScope } from "@/lib/projects/queries";
import {
  buildEstimateVsActual,
  buildQuotationCostBreakdown,
  effectiveQuotationStatus,
} from "@/lib/quotations/calculations";
import {
  getQuotationErrorMessage,
  isUuid,
  sanitizeSearchTerm,
} from "@/lib/quotations/helpers";
import type {
  QuotationDetail,
  QuotationFilters,
  QuotationListItem,
  QuotationListResult,
  QuotationStats,
} from "@/lib/quotations/types";
import { createClient } from "@/lib/supabase/server";
import type { Quotation, QuotationItem, QuotationStatus } from "@/types";

type QuotationJoin = Quotation & {
  projects:
    { id: string; name: string } | { id: string; name: string }[] | null;
  quotation_items?: { id: string }[] | null;
};

function projectFromJoin(
  value: QuotationJoin["projects"],
): { id: string; name: string } | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function parseOptionalDate(
  value: string | null | undefined,
): string | undefined {
  if (value && isIsoDate(value)) {
    return value;
  }

  return undefined;
}

function toCount(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseQuotationSearchParams(searchParams: {
  q?: string;
  from?: string;
  to?: string;
  status?: string;
  project_id?: string;
}): QuotationFilters {
  const status = searchParams.status;

  return {
    query: searchParams.q?.trim() || undefined,
    from: parseOptionalDate(searchParams.from),
    to: parseOptionalDate(searchParams.to),
    status:
      status === "all"
        ? "all"
        : status && isQuotationStatus(status)
          ? status
          : undefined,
    projectId:
      searchParams.project_id && isUuid(searchParams.project_id)
        ? searchParams.project_id
        : undefined,
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

function mapListRow(row: QuotationJoin): QuotationListItem {
  const project = projectFromJoin(row.projects);

  return {
    ...row,
    project_name: project?.name ?? null,
    effective_status: effectiveQuotationStatus(row.status, row.valid_until),
    item_count: row.quotation_items?.length ?? 0,
  };
}

function statsFromRows(
  rows: Array<{
    status: QuotationStatus;
    valid_until: string | null;
    total_amount: string;
  }>,
): QuotationStats {
  const today = todayIsoDate();
  const stats: QuotationStats = {
    total: rows.length,
    draft: 0,
    sent: 0,
    accepted: 0,
    rejected: 0,
    expired: 0,
    cancelled: 0,
    accepted_value: "0.00",
  };
  let acceptedPaise = 0;

  for (const row of rows) {
    const status = effectiveQuotationStatus(row.status, row.valid_until, today);
    stats[status] += 1;
    if (row.status === "accepted") {
      acceptedPaise += moneyToPaise(row.total_amount);
    }
  }

  stats.accepted_value = formatPaise(acceptedPaise);
  return stats;
}

export async function getQuotationStats(
  projectId?: string,
): Promise<
  { stats: QuotationStats; error: null } | { stats: null; error: string }
> {
  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { stats: null, error: scope.message };
  }

  const supabase = await createClient();

  if (projectId) {
    const { data, error } = await supabase
      .from("quotations")
      .select("status, valid_until, total_amount")
      .eq("business_id", scope.business.id)
      .eq("project_id", projectId);

    if (error) {
      return { stats: null, error: getQuotationErrorMessage(error) };
    }

    return {
      stats: statsFromRows(
        (data ?? []) as Array<{
          status: QuotationStatus;
          valid_until: string | null;
          total_amount: string;
        }>,
      ),
      error: null,
    };
  }

  const { data, error } = await supabase.rpc("quotation_workspace_stats", {
    target_business_id: scope.business.id,
  });

  if (error) {
    return { stats: null, error: getQuotationErrorMessage(error) };
  }

  const row = data?.[0];

  return {
    stats: {
      total: toCount(row?.total),
      draft: toCount(row?.draft),
      sent: toCount(row?.sent),
      accepted: toCount(row?.accepted),
      rejected: toCount(row?.rejected),
      expired: toCount(row?.expired),
      cancelled: toCount(row?.cancelled),
      accepted_value: formatPaise(moneyToPaise(row?.accepted_value ?? 0)),
    },
    error: null,
  };
}

export async function getQuotations(
  filters: QuotationFilters = {},
  pagination: Pagination = parsePagination({}),
): Promise<
  | { result: QuotationListResult; error: null }
  | { result: null; error: "not_found" }
  | { result: null; error: string }
> {
  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { result: null, error: scope.message };
  }

  if (filters.projectId) {
    const projectResult = await getProjectById(filters.projectId);

    if (projectResult.error === "not_found" || !projectResult.project) {
      return {
        result: null,
        error:
          projectResult.error === "not_found"
            ? "not_found"
            : projectResult.error,
      };
    }
  }

  const supabase = await createClient();
  const today = todayIsoDate();
  let query = supabase
    .from("quotations")
    .select("*, projects ( id, name ), quotation_items ( id )", {
      count: "exact",
    })
    .eq("business_id", scope.business.id);

  if (filters.projectId) {
    query = query.eq("project_id", filters.projectId);
  }

  if (filters.status && filters.status !== "all") {
    if (filters.status === "expired") {
      query = query
        .eq("status", "sent")
        .not("valid_until", "is", null)
        .lt("valid_until", today);
    } else if (filters.status === "sent") {
      query = query
        .eq("status", "sent")
        .or(`valid_until.is.null,valid_until.gte.${today}`);
    } else {
      query = query.eq("status", filters.status);
    }
  }

  if (filters.from) {
    query = query.gte("quotation_date", filters.from);
  }

  if (filters.to) {
    query = query.lte("quotation_date", filters.to);
  }

  if (filters.query) {
    const term = sanitizeSearchTerm(filters.query);
    if (term) {
      query = query.or(
        `quotation_number.ilike.%${term}%,client_name.ilike.%${term}%,title.ilike.%${term}%`,
      );
    }
  }

  const { data, error, count } = await query
    .order("quotation_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(pagination.from, pagination.to);

  if (error) {
    return { result: null, error: getQuotationErrorMessage(error) };
  }

  const statsResult = await getQuotationStats(filters.projectId);

  if (statsResult.error || !statsResult.stats) {
    return { result: null, error: statsResult.error };
  }

  const quotations = ((data ?? []) as QuotationJoin[]).map(mapListRow);
  const total = count ?? 0;
  const meta = paginationMeta(pagination.page, pagination.pageSize, total);

  return {
    result: {
      quotations,
      stats: statsResult.stats,
      ...meta,
    },
    error: null,
  };
}

export async function loadQuotationById(
  quotationId: string,
): Promise<
  | { quotation: QuotationDetail; error: null }
  | { quotation: null; error: "not_found" }
  | { quotation: null; error: string }
> {
  if (!isUuid(quotationId)) {
    return { quotation: null, error: "not_found" };
  }

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { quotation: null, error: scope.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotations")
    .select("*, projects ( id, name )")
    .eq("id", quotationId)
    .eq("business_id", scope.business.id)
    .maybeSingle();

  if (error) {
    return { quotation: null, error: getQuotationErrorMessage(error) };
  }

  if (!data) {
    return { quotation: null, error: "not_found" };
  }

  const quotation = data as QuotationJoin;
  const { data: itemRows, error: itemsError } = await supabase
    .from("quotation_items")
    .select("*")
    .eq("quotation_id", quotationId)
    .eq("business_id", scope.business.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (itemsError) {
    return { quotation: null, error: getQuotationErrorMessage(itemsError) };
  }

  const items = (itemRows ?? []) as QuotationItem[];
  const names = await loadCreatorNames([quotation.created_by]);
  const project = projectFromJoin(quotation.projects);
  const breakdown = buildQuotationCostBreakdown(items);
  const effectiveStatus = effectiveQuotationStatus(
    quotation.status,
    quotation.valid_until,
  );

  let estimateVsActual = null;

  if (quotation.project_id) {
    const costResult = await getProjectCostTotals(quotation.project_id);

    if (costResult.error === "not_found") {
      estimateVsActual = null;
    } else if (costResult.error || !costResult.totals) {
      return {
        quotation: null,
        error: costResult.error ?? "Unable to load project cost.",
      };
    } else {
      estimateVsActual = buildEstimateVsActual(breakdown, costResult.totals);
    }
  }

  return {
    quotation: {
      ...quotation,
      items,
      project_name: project?.name ?? null,
      created_by_name: names.get(quotation.created_by) ?? null,
      business_name: scope.business.name,
      effective_status: effectiveStatus,
      breakdown,
      estimate_vs_actual: estimateVsActual,
    },
    error: null,
  };
}

export const getQuotationById = cache(loadQuotationById);

export async function getLatestAcceptedQuotationForProject(
  projectId: string,
): Promise<
  | { quotation: QuotationListItem | null; error: null }
  | { quotation: null; error: "not_found" }
  | { quotation: null; error: string }
> {
  if (!isUuid(projectId)) {
    return { quotation: null, error: "not_found" };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      quotation: null,
      error:
        projectResult.error === "not_found" ? "not_found" : projectResult.error,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotations")
    .select("*, projects ( id, name ), quotation_items ( id )")
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id)
    .eq("status", "accepted")
    .order("quotation_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { quotation: null, error: getQuotationErrorMessage(error) };
  }

  if (!data) {
    return { quotation: null, error: null };
  }

  return { quotation: mapListRow(data as QuotationJoin), error: null };
}

export async function getProjectQuotationSummary(projectId: string): Promise<
  | {
      quotation: QuotationListItem;
      estimate_vs_actual: QuotationDetail["estimate_vs_actual"];
      error: null;
    }
  | { quotation: null; estimate_vs_actual: null; error: null }
  | { quotation: null; estimate_vs_actual: null; error: "not_found" }
  | { quotation: null; estimate_vs_actual: null; error: string }
> {
  const latest = await getLatestAcceptedQuotationForProject(projectId);

  if (latest.error === "not_found") {
    return {
      quotation: null,
      estimate_vs_actual: null,
      error: "not_found",
    };
  }

  if (latest.error) {
    return {
      quotation: null,
      estimate_vs_actual: null,
      error: latest.error,
    };
  }

  if (!latest.quotation) {
    return { quotation: null, estimate_vs_actual: null, error: null };
  }

  const detail = await getQuotationById(latest.quotation.id);

  if (detail.error === "not_found" || !detail.quotation) {
    return {
      quotation: null,
      estimate_vs_actual: null,
      error:
        detail.error === "not_found"
          ? "not_found"
          : (detail.error ?? "Unable to load quotation."),
    };
  }

  return {
    quotation: latest.quotation,
    estimate_vs_actual: detail.quotation.estimate_vs_actual,
    error: null,
  };
}

export type { QuotationStatus };
