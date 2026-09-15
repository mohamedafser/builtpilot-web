import { cache } from "react";
import { SITE_PHOTO_BUCKET } from "@/constants/daily-report";
import { isProjectStatus } from "@/constants/project";
import {
  paginationMeta,
  parsePagination,
  type Pagination,
} from "@/lib/api/pagination";
import { buildBoqSummary, buildItemProgress } from "@/lib/boq/calculations";
import { isUuid } from "@/lib/boq/helpers";
import {
  getClientPortalErrorMessage,
  moneyString,
  portalLoadErrorMessage,
  portalStatusFromAccess,
  quantityString,
  toCount,
} from "@/lib/client-portal/helpers";
import { DEFAULT_CLIENT_PORTAL_SETTINGS } from "@/lib/client-portal/permissions";
import {
  hashClientPortalToken,
  isClientPortalToken,
  normalizeClientPortalToken,
} from "@/lib/client-portal/tokens";
import type {
  ClientPortalAccessSummary,
  ClientPortalBOQ,
  ClientPortalBOQItem,
  ClientPortalCostSummary,
  ClientPortalListResult,
  ClientPortalMeasurement,
  ClientPortalOverview,
  ClientPortalPhoto,
  ClientPortalQuotation,
  ClientPortalReport,
  ClientPortalReportDetail,
  ClientPortalSession,
  ClientPortalSessionResult,
  ClientPortalSettings,
  ContractorClientPortalState,
} from "@/lib/client-portal/types";
import { buildProjectCostTotals } from "@/lib/costs/calculations";
import { getProjectCostTotals } from "@/lib/costs/queries";
import { getDailyReport, getDailyReports } from "@/lib/daily-reports/queries";
import { getCurrentMembership } from "@/lib/auth";
import { getProjectById } from "@/lib/projects/queries";
import {
  getLatestAcceptedQuotationForProject,
  getQuotationById,
} from "@/lib/quotations/queries";
import { createAnonymousClient } from "@/lib/supabase/anon";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Boq, BoqItem, BoqUnit } from "@/types";
import type { Database } from "@/types/database";

type ResolveRow =
  Database["public"]["Functions"]["resolve_client_portal"]["Returns"][number];

const GENERIC_ERROR = portalLoadErrorMessage();
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function settingsFromRow(row: ResolveRow): ClientPortalSettings {
  return {
    show_project_overview: row.show_project_overview ?? true,
    show_daily_reports: row.show_daily_reports ?? true,
    show_site_photos: row.show_site_photos ?? true,
    show_boq: row.show_boq ?? true,
    show_measurements: row.show_measurements ?? true,
    show_quotation: row.show_quotation ?? false,
    show_project_cost: row.show_project_cost ?? false,
    show_client_contact: row.show_client_contact ?? true,
    show_project_location: row.show_project_location ?? true,
  };
}

function blockedStatus(
  status: string | null | undefined,
): "invalid" | "expired" | "revoked" {
  if (status === "expired" || status === "revoked") {
    return status;
  }

  return "invalid";
}

function sessionFromResolve(
  row: ResolveRow,
  base: ClientPortalSession["base"],
  isPreview: boolean,
): ClientPortalSessionResult {
  if (row.status !== "ok" || !row.project_name || !row.client_name) {
    return { status: blockedStatus(row.status) };
  }

  const projectStatus =
    row.project_status && isProjectStatus(row.project_status)
      ? row.project_status
      : "planning";

  return {
    status: "ok",
    isPreview,
    base,
    access: {
      client_name: row.client_name,
      client_email: row.client_email,
      client_phone: row.client_phone,
    },
    settings: settingsFromRow(row),
    project: {
      name: row.project_name,
      status: projectStatus,
      location: row.project_location,
      description: row.project_description,
      start_date: row.project_start_date,
      expected_end_date: row.project_expected_end_date,
      client_name: row.project_client_name,
      client_email: row.project_client_email,
      client_phone: row.project_client_phone,
    },
    businessName: row.business_name ?? "",
  };
}

async function signStoragePaths(
  paths: string[],
  mode: "public" | "preview",
): Promise<Map<string, string>> {
  const signedUrls = new Map<string, string>();

  if (paths.length === 0) {
    return signedUrls;
  }

  const client = mode === "public" ? createAdminClient() : await createClient();

  if (!client) {
    return signedUrls;
  }

  const { data, error } = await client.storage
    .from(SITE_PHOTO_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    return signedUrls;
  }

  for (const item of data) {
    if (item.path && item.signedUrl) {
      signedUrls.set(item.path, item.signedUrl);
    }
  }

  return signedUrls;
}

function firstRpcRow<T>(data: T[] | T | null | undefined): T | null {
  if (data == null) {
    return null;
  }

  return Array.isArray(data) ? (data[0] ?? null) : data;
}

function tokenHashOrNull(token: string): string | null {
  const normalized = normalizeClientPortalToken(token);

  if (!isClientPortalToken(normalized)) {
    return null;
  }

  return hashClientPortalToken(normalized);
}

function logPortalRpcError(fn: string, error: unknown) {
  const record =
    error && typeof error === "object"
      ? (error as {
          code?: string;
          message?: string;
          details?: string;
          hint?: string;
        })
      : null;
  const summary = [
    record?.code,
    record?.message,
    record?.details,
    record?.hint,
  ]
    .filter(Boolean)
    .join(" — ");

  console.error(
    `[client-portal:${fn}] ${summary || "Unknown portal lookup error."}`,
  );
}

function isPermissionDenied(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "42501" ||
    (error.message ?? "").toLowerCase().includes("permission denied")
  );
}

async function fetchPortalRowFromClient(
  supabase: Awaited<ReturnType<typeof createClient>>,
  hash: string,
): Promise<ResolveRow | null> {
  const { data: access, error } = await supabase
    .from("project_client_access")
    .select(
      "id, business_id, project_id, client_name, client_email, client_phone, is_active, expires_at, last_accessed_at",
    )
    .eq("access_token_hash", hash)
    .maybeSingle();

  if (error || !access) {
    return null;
  }

  if (!access.is_active) {
    return { status: "revoked" } as ResolveRow;
  }

  if (access.expires_at && new Date(access.expires_at).getTime() <= Date.now()) {
    return { status: "expired" } as ResolveRow;
  }

  const [
    { data: project },
    { data: business },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "name, status, location, description, start_date, expected_end_date, client_name, client_email, client_phone",
      )
      .eq("id", access.project_id)
      .eq("business_id", access.business_id)
      .maybeSingle(),
    supabase
      .from("businesses")
      .select("name")
      .eq("id", access.business_id)
      .maybeSingle(),
    supabase
      .from("project_client_settings")
      .select(
        "show_project_overview, show_daily_reports, show_site_photos, show_boq, show_measurements, show_quotation, show_project_cost, show_client_contact, show_project_location",
      )
      .eq("project_id", access.project_id)
      .eq("business_id", access.business_id)
      .maybeSingle(),
  ]);

  if (!project?.name) {
    return { status: "invalid" } as ResolveRow;
  }

  const flags = settings ?? DEFAULT_CLIENT_PORTAL_SETTINGS;

  return {
    status: "ok",
    access_id: access.id,
    business_id: access.business_id,
    project_id: access.project_id,
    client_name: access.client_name,
    client_email: access.client_email,
    client_phone: access.client_phone,
    expires_at: access.expires_at,
    last_accessed_at: access.last_accessed_at,
    business_name: business?.name ?? "",
    project_name: project.name,
    project_status: isProjectStatus(project.status) ? project.status : null,
    project_location: project.location,
    project_description: project.description,
    project_start_date: project.start_date,
    project_expected_end_date: project.expected_end_date,
    project_client_name: project.client_name,
    project_client_email: project.client_email,
    project_client_phone: project.client_phone,
    show_project_overview: flags.show_project_overview,
    show_daily_reports: flags.show_daily_reports,
    show_site_photos: flags.show_site_photos,
    show_boq: flags.show_boq,
    show_measurements: flags.show_measurements,
    show_quotation: flags.show_quotation,
    show_project_cost: flags.show_project_cost,
    show_client_contact: flags.show_client_contact,
    show_project_location: flags.show_project_location,
  };
}

export const getClientPortalSession = cache(
  async function getClientPortalSession(
    token: string,
  ): Promise<ClientPortalSessionResult> {
    const normalized = normalizeClientPortalToken(token);
    const hash = tokenHashOrNull(normalized);
    const base = { kind: "public" as const, token: normalized };

    if (!hash) {
      return { status: "invalid" };
    }

    const authed = await createClient();
    const tableRow = await fetchPortalRowFromClient(authed, hash);

    if (tableRow) {
      if (tableRow.status === "ok" && tableRow.access_id) {
        void authed
          .from("project_client_access")
          .update({ last_accessed_at: new Date().toISOString() })
          .eq("id", tableRow.access_id);
      }

      return sessionFromResolve(tableRow, base, false);
    }

    const anon = createAnonymousClient();
    const lookup = await anon.rpc("lookup_client_portal", {
      p_token_hash: hash,
    });

    if (!lookup.error) {
      const row = firstRpcRow(lookup.data);
      return row
        ? sessionFromResolve(row, base, false)
        : { status: "invalid" };
    }

    if (!isPermissionDenied(lookup.error)) {
      logPortalRpcError("lookup_client_portal", lookup.error);
    }

    const resolved = await anon.rpc("resolve_client_portal", {
      p_token_hash: hash,
    });

    if (resolved.error) {
      if (!isPermissionDenied(resolved.error)) {
        logPortalRpcError("resolve_client_portal", resolved.error);
      }
      return { status: "invalid" };
    }

    const row = firstRpcRow(resolved.data);
    return row ? sessionFromResolve(row, base, false) : { status: "invalid" };
  },
);

function pickPortalBoq(boqs: Boq[]): Boq | null {
  const ranked = boqs
    .filter((boq) => boq.status !== "archived")
    .slice()
    .sort((left, right) => {
      const rank = (status: Boq["status"]) =>
        status === "active" ? 0 : status === "completed" ? 1 : 2;
      const rankDiff = rank(left.status) - rank(right.status);
      if (rankDiff !== 0) {
        return rankDiff;
      }
      return right.created_at.localeCompare(left.created_at);
    });

  return ranked[0] ?? null;
}

function mapBoqItems(
  rows: Array<{
    boq_id: string;
    boq_name: string;
    section_id: string | null;
    section_name: string | null;
    item_id: string;
    item_code: string | null;
    description: string;
    unit: BoqUnit;
    estimated_quantity: string | number;
    completed_quantity: string | number;
    rate: string | number;
    estimated_amount: string | number;
  }>,
): ClientPortalBOQ | null {
  const first = rows[0];

  if (!first) {
    return null;
  }

  const items: ClientPortalBOQItem[] = rows.map((row) => {
    const progress = buildItemProgress({
      estimated_quantity: quantityString(row.estimated_quantity),
      completed_quantity: quantityString(row.completed_quantity),
      rate: moneyString(row.rate),
      estimated_amount: moneyString(row.estimated_amount),
    });

    return {
      id: row.item_id,
      section_id: row.section_id,
      section_name: row.section_name,
      item_code: row.item_code,
      description: row.description,
      unit: row.unit,
      estimated_quantity: progress.estimated_quantity,
      completed_quantity: progress.completed_quantity,
      remaining_quantity: progress.remaining_quantity,
      rate: progress.rate,
      estimated_amount: progress.estimated_amount,
      completed_value: progress.completed_value,
      remaining_value: progress.remaining_value,
      completion_percentage: progress.completion_percentage,
    };
  });

  return {
    id: first.boq_id,
    name: first.boq_name,
    items,
    summary: buildBoqSummary(items),
  };
}

export async function getClientPortalReports(
  token: string,
  pagination: Pagination = parsePagination({}),
): Promise<
  | { result: ClientPortalListResult<ClientPortalReport>; error: null }
  | { result: null; error: "unavailable" | "invalid" | string }
> {
  const session = await getClientPortalSession(token);

  if (session.status !== "ok") {
    return { result: null, error: session.status };
  }

  if (!session.settings.show_daily_reports) {
    return { result: null, error: "unavailable" };
  }

  const hash = tokenHashOrNull(token);

  if (!hash) {
    return { result: null, error: "invalid" };
  }

  const supabase = createAnonymousClient();
  const { data, error } = await supabase.rpc("client_portal_reports", {
    p_token_hash: hash,
    p_limit: pagination.pageSize,
    p_offset: pagination.from,
  });

  if (error) {
    logPortalRpcError("client_portal_reports", error);
    return { result: null, error: GENERIC_ERROR };
  }

  const rows = data ?? [];
  const total = toCount(rows[0]?.total_count ?? 0);
  const items: ClientPortalReport[] = rows.map((row) => ({
    id: row.id,
    report_date: row.report_date,
    weather: row.weather,
    work_completed: row.work_completed,
    issues: row.issues,
    tomorrow_plan: row.tomorrow_plan,
    general_notes: row.general_notes,
    photo_count: session.settings.show_site_photos
      ? toCount(row.photo_count)
      : 0,
    worker_count: toCount(row.worker_count),
  }));

  return {
    result: {
      items,
      ...paginationMeta(pagination.page, pagination.pageSize, total),
    },
    error: null,
  };
}

export async function getClientPortalReport(
  token: string,
  reportId: string,
): Promise<
  | { detail: ClientPortalReportDetail; error: null }
  | { detail: null; error: "unavailable" | "invalid" | "not_found" | string }
> {
  const session = await getClientPortalSession(token);

  if (session.status !== "ok") {
    return { detail: null, error: session.status };
  }

  if (!session.settings.show_daily_reports || !isUuid(reportId)) {
    return { detail: null, error: "unavailable" };
  }

  const hash = tokenHashOrNull(token);

  if (!hash) {
    return { detail: null, error: "invalid" };
  }

  const supabase = createAnonymousClient();
  const [{ data, error }, manpowerResult] = await Promise.all([
    supabase.rpc("client_portal_report", {
      p_token_hash: hash,
      p_report_id: reportId,
    }),
    supabase.rpc("client_portal_report_manpower", {
      p_token_hash: hash,
      p_report_id: reportId,
    }),
  ]);

  if (error || manpowerResult.error) {
    logPortalRpcError(
      "client_portal_report",
      error ?? manpowerResult.error ?? { message: GENERIC_ERROR },
    );
    return { detail: null, error: GENERIC_ERROR };
  }

  const row = data?.[0];

  if (!row) {
    return { detail: null, error: "not_found" };
  }

  return {
    detail: {
      report: {
        id: row.id,
        report_date: row.report_date,
        weather: row.weather,
        work_completed: row.work_completed,
        issues: row.issues,
        tomorrow_plan: row.tomorrow_plan,
        general_notes: row.general_notes,
      },
      manpower: (manpowerResult.data ?? []).map((item) => ({
        role: item.role,
        worker_count: item.worker_count,
      })),
    },
    error: null,
  };
}

export async function getClientPortalPhotos(
  token: string,
  pagination: Pagination = parsePagination({}),
): Promise<
  | { result: ClientPortalListResult<ClientPortalPhoto>; error: null }
  | { result: null; error: "unavailable" | "invalid" | string }
> {
  const session = await getClientPortalSession(token);

  if (session.status !== "ok") {
    return { result: null, error: session.status };
  }

  if (!session.settings.show_site_photos) {
    return { result: null, error: "unavailable" };
  }

  const hash = tokenHashOrNull(token);

  if (!hash) {
    return { result: null, error: "invalid" };
  }

  const supabase = createAnonymousClient();
  const { data, error } = await supabase.rpc("client_portal_photos", {
    p_token_hash: hash,
    p_limit: pagination.pageSize,
    p_offset: pagination.from,
  });

  if (error) {
    logPortalRpcError("client_portal_photos", error);
    return { result: null, error: GENERIC_ERROR };
  }

  const rows = data ?? [];
  const signed = await signStoragePaths(
    rows.map((row) => row.storage_path),
    "public",
  );
  const total = toCount(rows[0]?.total_count ?? 0);

  return {
    result: {
      items: rows.map((row) => ({
        id: row.id,
        caption: row.caption,
        created_at: row.created_at,
        report_date: row.report_date,
        signed_url: signed.get(row.storage_path) ?? null,
      })),
      ...paginationMeta(pagination.page, pagination.pageSize, total),
    },
    error: null,
  };
}

export async function getClientPortalBOQ(
  token: string,
): Promise<
  | { boq: ClientPortalBOQ | null; error: null }
  | { boq: null; error: "unavailable" | "invalid" | string }
> {
  const session = await getClientPortalSession(token);

  if (session.status !== "ok") {
    return { boq: null, error: session.status };
  }

  if (!session.settings.show_boq) {
    return { boq: null, error: "unavailable" };
  }

  const hash = tokenHashOrNull(token);

  if (!hash) {
    return { boq: null, error: "invalid" };
  }

  const supabase = createAnonymousClient();
  const { data, error } = await supabase.rpc("client_portal_boq_items", {
    p_token_hash: hash,
  });

  if (error) {
    logPortalRpcError("client_portal_boq_items", error);
    return { boq: null, error: GENERIC_ERROR };
  }

  return { boq: mapBoqItems(data ?? []), error: null };
}

export async function getClientPortalMeasurements(
  token: string,
  pagination: Pagination = parsePagination({}),
): Promise<
  | { result: ClientPortalListResult<ClientPortalMeasurement>; error: null }
  | { result: null; error: "unavailable" | "invalid" | string }
> {
  const session = await getClientPortalSession(token);

  if (session.status !== "ok") {
    return { result: null, error: session.status };
  }

  if (!session.settings.show_measurements) {
    return { result: null, error: "unavailable" };
  }

  const hash = tokenHashOrNull(token);

  if (!hash) {
    return { result: null, error: "invalid" };
  }

  const supabase = createAnonymousClient();
  const { data, error } = await supabase.rpc("client_portal_measurements", {
    p_token_hash: hash,
    p_limit: pagination.pageSize,
    p_offset: pagination.from,
  });

  if (error) {
    logPortalRpcError("client_portal_measurements", error);
    return { result: null, error: GENERIC_ERROR };
  }

  const rows = data ?? [];
  const total = toCount(rows[0]?.total_count ?? 0);

  return {
    result: {
      items: rows.map((row) => ({
        id: row.id,
        measurement_date: row.measurement_date,
        quantity: quantityString(row.quantity),
        unit: row.unit,
        location: row.location,
        description: row.description,
        reference: row.reference,
        item_description: row.item_description,
      })),
      ...paginationMeta(pagination.page, pagination.pageSize, total),
    },
    error: null,
  };
}

export async function getClientPortalQuotation(
  token: string,
): Promise<
  | { quotation: ClientPortalQuotation | null; error: null }
  | { quotation: null; error: "unavailable" | "invalid" | string }
> {
  const session = await getClientPortalSession(token);

  if (session.status !== "ok") {
    return { quotation: null, error: session.status };
  }

  if (!session.settings.show_quotation) {
    return { quotation: null, error: "unavailable" };
  }

  const hash = tokenHashOrNull(token);

  if (!hash) {
    return { quotation: null, error: "invalid" };
  }

  const supabase = createAnonymousClient();
  const [{ data, error }, itemsResult] = await Promise.all([
    supabase.rpc("client_portal_quotation", { p_token_hash: hash }),
    supabase.rpc("client_portal_quotation_items", { p_token_hash: hash }),
  ]);

  if (error || itemsResult.error) {
    logPortalRpcError(
      "client_portal_quotation",
      error ?? itemsResult.error ?? { message: GENERIC_ERROR },
    );
    return { quotation: null, error: GENERIC_ERROR };
  }

  const row = data?.[0];

  if (!row) {
    return { quotation: null, error: null };
  }

  return {
    quotation: {
      quotation_number: row.quotation_number,
      title: row.title,
      quotation_date: row.quotation_date,
      valid_until: row.valid_until,
      client_name: row.client_name,
      client_phone: row.client_phone,
      client_email: row.client_email,
      client_address: row.client_address,
      subtotal: moneyString(row.subtotal),
      discount_type: row.discount_type,
      discount_value: moneyString(row.discount_value),
      discount_amount: moneyString(row.discount_amount),
      tax_percentage:
        row.tax_percentage == null ? null : quantityString(row.tax_percentage),
      tax_amount: moneyString(row.tax_amount),
      total_amount: moneyString(row.total_amount),
      notes: row.notes,
      terms: row.terms,
      items: (itemsResult.data ?? []).map((item) => ({
        id: item.id,
        description: item.description,
        quantity: quantityString(item.quantity),
        unit: item.unit,
        unit_price: moneyString(item.unit_price),
        total_amount: moneyString(item.total_amount),
      })),
    },
    error: null,
  };
}

export async function getClientPortalCostSummary(
  token: string,
): Promise<
  | { cost: ClientPortalCostSummary | null; error: null }
  | { cost: null; error: "unavailable" | "invalid" | string }
> {
  const session = await getClientPortalSession(token);

  if (session.status !== "ok") {
    return { cost: null, error: session.status };
  }

  if (!session.settings.show_project_cost) {
    return { cost: null, error: "unavailable" };
  }

  const hash = tokenHashOrNull(token);

  if (!hash) {
    return { cost: null, error: "invalid" };
  }

  const supabase = createAnonymousClient();
  const { data, error } = await supabase.rpc("client_portal_cost_totals", {
    p_token_hash: hash,
  });

  if (error) {
    logPortalRpcError("client_portal_cost_totals", error);
    return { cost: null, error: GENERIC_ERROR };
  }

  const row = data?.[0];

  if (!row) {
    return { cost: null, error: null };
  }

  return {
    cost: buildProjectCostTotals({
      labour: row.labour_cost,
      material: row.material_cost,
      expense: row.expense_cost,
      labourRecords: toCount(row.labour_records),
      materialRecords: toCount(row.material_records),
      expenseRecords: toCount(row.expense_records),
    }),
    error: null,
  };
}

export async function getClientPortalOverview(
  token: string,
): Promise<
  | { overview: ClientPortalOverview; error: null }
  | {
      overview: null;
      error:
        | Exclude<ClientPortalSessionResult, ClientPortalSession>["status"]
        | string;
    }
> {
  const session = await getClientPortalSession(token);

  if (session.status !== "ok") {
    return { overview: null, error: session.status };
  }

  const [reports, photos, boq, measurements, quotation, cost] =
    await Promise.all([
      session.settings.show_daily_reports
        ? getClientPortalReports(token, parsePagination({ page_size: "3" }))
        : Promise.resolve({ result: null, error: "unavailable" as const }),
      session.settings.show_site_photos
        ? getClientPortalPhotos(token, parsePagination({ page_size: "6" }))
        : Promise.resolve({ result: null, error: "unavailable" as const }),
      session.settings.show_boq
        ? getClientPortalBOQ(token)
        : Promise.resolve({ boq: null, error: "unavailable" as const }),
      session.settings.show_measurements
        ? getClientPortalMeasurements(
            token,
            parsePagination({ page_size: "1" }),
          )
        : Promise.resolve({ result: null, error: "unavailable" as const }),
      session.settings.show_quotation
        ? getClientPortalQuotation(token)
        : Promise.resolve({ quotation: null, error: "unavailable" as const }),
      session.settings.show_project_cost
        ? getClientPortalCostSummary(token)
        : Promise.resolve({ cost: null, error: "unavailable" as const }),
    ]);

  const quotationData = "quotation" in quotation ? quotation.quotation : null;

  return {
    overview: {
      latestReport: reports.result?.items[0] ?? null,
      recentPhotos: photos.result?.items ?? [],
      boq: "boq" in boq ? boq.boq : null,
      measurementCount: measurements.result?.total ?? 0,
      quotation: quotationData
        ? {
            quotation_number: quotationData.quotation_number,
            title: quotationData.title,
            total_amount: quotationData.total_amount,
          }
        : null,
      cost: "cost" in cost ? cost.cost : null,
    },
    error: null,
  };
}

export const getContractorClientPortal = cache(
  async function getContractorClientPortal(
    projectId: string,
  ): Promise<
    | { state: ContractorClientPortalState; error: null }
    | { state: null; error: "not_found" }
    | { state: null; error: string }
  > {
    const projectResult = await getProjectById(projectId);

    if (projectResult.error === "not_found" || !projectResult.project) {
      return {
        state: null,
        error:
          projectResult.error === "not_found"
            ? "not_found"
            : projectResult.error,
      };
    }

    const supabase = await createClient();
    const [
      { data: accessRows, error: accessError },
      { data: settingsRow, error: settingsError },
    ] = await Promise.all([
      supabase
        .from("project_client_access")
        .select(
          "id, client_name, client_email, client_phone, is_active, expires_at, last_accessed_at, created_at",
        )
        .eq("project_id", projectId)
        .eq("business_id", projectResult.project.business_id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("project_client_settings")
        .select(
          "show_project_overview, show_daily_reports, show_site_photos, show_boq, show_measurements, show_quotation, show_project_cost, show_client_contact, show_project_location",
        )
        .eq("project_id", projectId)
        .eq("business_id", projectResult.project.business_id)
        .maybeSingle(),
    ]);

    if (accessError) {
      return { state: null, error: getClientPortalErrorMessage(accessError) };
    }

    if (settingsError) {
      return { state: null, error: getClientPortalErrorMessage(settingsError) };
    }

    const accessRow = accessRows?.[0] ?? null;
    const access: ClientPortalAccessSummary | null = accessRow
      ? {
          id: accessRow.id,
          client_name: accessRow.client_name,
          client_email: accessRow.client_email,
          client_phone: accessRow.client_phone,
          is_active: accessRow.is_active,
          expires_at: accessRow.expires_at,
          last_accessed_at: accessRow.last_accessed_at,
          created_at: accessRow.created_at,
          portal_status: portalStatusFromAccess(accessRow),
        }
      : null;

    return {
      state: {
        project_id: projectResult.project.id,
        project_name: projectResult.project.name,
        access,
        settings: settingsRow ?? DEFAULT_CLIENT_PORTAL_SETTINGS,
      },
      error: null,
    };
  },
);

export const getPreviewClientPortalSession = cache(
  async function getPreviewClientPortalSession(
    projectId: string,
  ): Promise<ClientPortalSessionResult> {
    const result = await getContractorClientPortal(projectId);
    const projectResult = await getProjectById(projectId);
    const membership = await getCurrentMembership();

    if (
      result.error ||
      !result.state ||
      !projectResult.project ||
      projectResult.error
    ) {
      return { status: "invalid" };
    }

    if (
      !result.state.access ||
      result.state.access.portal_status !== "active"
    ) {
      return { status: "revoked" };
    }

    return {
      status: "ok",
      isPreview: true,
      base: { kind: "preview", projectId },
      access: {
        client_name: result.state.access.client_name,
        client_email: result.state.access.client_email,
        client_phone: result.state.access.client_phone,
      },
      settings: result.state.settings,
      project: {
        name: projectResult.project.name,
        status: projectResult.project.status,
        location: projectResult.project.location,
        description: projectResult.project.description,
        start_date: projectResult.project.start_date,
        expected_end_date: projectResult.project.expected_end_date,
        client_name: projectResult.project.client_name,
        client_email: projectResult.project.client_email,
        client_phone: projectResult.project.client_phone,
      },
      businessName: membership?.business.name ?? "",
    };
  },
);

async function loadPreviewBoq(
  projectId: string,
): Promise<ClientPortalBOQ | null> {
  const projectResult = await getProjectById(projectId);

  if (!projectResult.project) {
    return null;
  }

  const supabase = await createClient();
  const { data: boqRows, error: boqError } = await supabase
    .from("boqs")
    .select("*")
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id)
    .neq("status", "archived");

  if (boqError) {
    return null;
  }

  const boq = pickPortalBoq((boqRows ?? []) as Boq[]);

  if (!boq) {
    return null;
  }

  const [{ data: items }, { data: sections }] = await Promise.all([
    supabase
      .from("boq_items")
      .select("*")
      .eq("boq_id", boq.id)
      .eq("business_id", projectResult.project.business_id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("boq_sections")
      .select("id, name")
      .eq("boq_id", boq.id)
      .eq("business_id", projectResult.project.business_id),
  ]);

  const sectionNames = new Map(
    (sections ?? []).map((section) => [section.id, section.name]),
  );

  return mapBoqItems(
    ((items ?? []) as BoqItem[]).map((item) => ({
      boq_id: boq.id,
      boq_name: boq.name,
      section_id: item.section_id,
      section_name: item.section_id
        ? (sectionNames.get(item.section_id) ?? null)
        : null,
      item_id: item.id,
      item_code: item.item_code,
      description: item.description,
      unit: item.unit,
      estimated_quantity: item.estimated_quantity,
      completed_quantity: item.completed_quantity,
      rate: item.rate,
      estimated_amount: item.estimated_amount,
    })),
  );
}

export async function getPreviewClientPortalOverview(
  projectId: string,
): Promise<
  | { overview: ClientPortalOverview; error: null }
  | { overview: null; error: string }
> {
  const session = await getPreviewClientPortalSession(projectId);

  if (session.status !== "ok") {
    return { overview: null, error: session.status };
  }

  const [reports, photos, boq, measurements, quotation, cost] =
    await Promise.all([
      session.settings.show_daily_reports
        ? getPreviewClientPortalReports(
            projectId,
            parsePagination({ page_size: "3" }),
          )
        : Promise.resolve({ result: null, error: "unavailable" as const }),
      session.settings.show_site_photos
        ? getPreviewClientPortalPhotos(
            projectId,
            parsePagination({ page_size: "6" }),
          )
        : Promise.resolve({ result: null, error: "unavailable" as const }),
      session.settings.show_boq
        ? loadPreviewBoq(projectId).then((value) => ({
            boq: value,
            error: null as string | null,
          }))
        : Promise.resolve({ boq: null, error: "unavailable" as const }),
      session.settings.show_measurements
        ? getPreviewClientPortalMeasurements(
            projectId,
            parsePagination({ page_size: "1" }),
          )
        : Promise.resolve({ result: null, error: "unavailable" as const }),
      session.settings.show_quotation
        ? getPreviewClientPortalQuotation(projectId)
        : Promise.resolve({ quotation: null, error: "unavailable" as const }),
      session.settings.show_project_cost
        ? getPreviewClientPortalCost(projectId)
        : Promise.resolve({ cost: null, error: "unavailable" as const }),
    ]);

  const quotationData = "quotation" in quotation ? quotation.quotation : null;

  return {
    overview: {
      latestReport: reports.result?.items[0] ?? null,
      recentPhotos: photos.result?.items ?? [],
      boq: "boq" in boq ? boq.boq : null,
      measurementCount: measurements.result?.total ?? 0,
      quotation: quotationData
        ? {
            quotation_number: quotationData.quotation_number,
            title: quotationData.title,
            total_amount: quotationData.total_amount,
          }
        : null,
      cost: "cost" in cost ? cost.cost : null,
    },
    error: null,
  };
}

export async function getPreviewClientPortalReports(
  projectId: string,
  pagination: Pagination = parsePagination({}),
): Promise<
  | { result: ClientPortalListResult<ClientPortalReport>; error: null }
  | { result: null; error: "unavailable" | string }
> {
  const session = await getPreviewClientPortalSession(projectId);

  if (session.status !== "ok" || !session.settings.show_daily_reports) {
    return { result: null, error: "unavailable" };
  }

  const result = await getDailyReports(projectId, {}, pagination);

  if (result.error === "not_found") {
    return { result: null, error: "unavailable" };
  }

  if (result.error) {
    return { result: null, error: GENERIC_ERROR };
  }

  return {
    result: {
      items: result.reports.map((report) => ({
        id: report.id,
        report_date: report.report_date,
        weather: report.weather,
        work_completed: report.work_completed,
        issues: report.issues,
        tomorrow_plan: report.tomorrow_plan,
        general_notes: report.general_notes,
        photo_count: session.settings.show_site_photos ? report.photo_count : 0,
        worker_count: report.worker_count,
      })),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
    },
    error: null,
  };
}

export async function getPreviewClientPortalReport(
  projectId: string,
  reportId: string,
): Promise<
  | { detail: ClientPortalReportDetail; error: null }
  | { detail: null; error: "unavailable" | "not_found" | string }
> {
  const session = await getPreviewClientPortalSession(projectId);

  if (session.status !== "ok" || !session.settings.show_daily_reports) {
    return { detail: null, error: "unavailable" };
  }

  const result = await getDailyReport(projectId, reportId);

  if (result.error === "not_found" || !result.detail) {
    return {
      detail: null,
      error: result.error === "not_found" ? "not_found" : GENERIC_ERROR,
    };
  }

  if (result.detail.report.archived_at) {
    return { detail: null, error: "not_found" };
  }

  return {
    detail: {
      report: {
        id: result.detail.report.id,
        report_date: result.detail.report.report_date,
        weather: result.detail.report.weather,
        work_completed: result.detail.report.work_completed,
        issues: result.detail.report.issues,
        tomorrow_plan: result.detail.report.tomorrow_plan,
        general_notes: result.detail.report.general_notes,
      },
      manpower: result.detail.manpower.map((row) => ({
        role: row.role,
        worker_count: row.worker_count,
      })),
    },
    error: null,
  };
}

export async function getPreviewClientPortalPhotos(
  projectId: string,
  pagination: Pagination = parsePagination({}),
): Promise<
  | { result: ClientPortalListResult<ClientPortalPhoto>; error: null }
  | { result: null; error: "unavailable" | string }
> {
  const session = await getPreviewClientPortalSession(projectId);

  if (session.status !== "ok" || !session.settings.show_site_photos) {
    return { result: null, error: "unavailable" };
  }

  const projectResult = await getProjectById(projectId);

  if (!projectResult.project) {
    return { result: null, error: "unavailable" };
  }

  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("site_photos")
    .select("id, caption, created_at, storage_path, daily_report_id", {
      count: "exact",
    })
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id)
    .order("created_at", { ascending: false })
    .range(pagination.from, pagination.to);

  if (error) {
    return { result: null, error: GENERIC_ERROR };
  }

  const rows = data ?? [];
  const reportIds = [
    ...new Set(
      rows
        .map((row) => row.daily_report_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const reportDates = new Map<string, string>();

  if (reportIds.length > 0) {
    const { data: reports } = await supabase
      .from("daily_site_reports")
      .select("id, report_date, archived_at")
      .eq("project_id", projectId)
      .in("id", reportIds);

    for (const report of reports ?? []) {
      if (!report.archived_at) {
        reportDates.set(report.id, report.report_date);
      }
    }
  }

  const visible = rows.filter((row) => {
    if (!row.daily_report_id) {
      return true;
    }
    return reportDates.has(row.daily_report_id);
  });

  const signed = await signStoragePaths(
    visible.map((row) => row.storage_path),
    "preview",
  );

  return {
    result: {
      items: visible.map((row) => ({
        id: row.id,
        caption: row.caption,
        created_at: row.created_at,
        report_date: row.daily_report_id
          ? (reportDates.get(row.daily_report_id) ?? null)
          : null,
        signed_url: signed.get(row.storage_path) ?? null,
      })),
      ...paginationMeta(
        pagination.page,
        pagination.pageSize,
        count ?? visible.length,
      ),
    },
    error: null,
  };
}

export async function getPreviewClientPortalBOQ(
  projectId: string,
): Promise<
  | { boq: ClientPortalBOQ | null; error: null }
  | { boq: null; error: "unavailable" | string }
> {
  const session = await getPreviewClientPortalSession(projectId);

  if (session.status !== "ok" || !session.settings.show_boq) {
    return { boq: null, error: "unavailable" };
  }

  return { boq: await loadPreviewBoq(projectId), error: null };
}

export async function getPreviewClientPortalMeasurements(
  projectId: string,
  pagination: Pagination = parsePagination({}),
): Promise<
  | { result: ClientPortalListResult<ClientPortalMeasurement>; error: null }
  | { result: null; error: "unavailable" | string }
> {
  const session = await getPreviewClientPortalSession(projectId);

  if (session.status !== "ok" || !session.settings.show_measurements) {
    return { result: null, error: "unavailable" };
  }

  const projectResult = await getProjectById(projectId);

  if (!projectResult.project) {
    return { result: null, error: "unavailable" };
  }

  const boq = await loadPreviewBoq(projectId);

  if (!boq) {
    return {
      result: {
        items: [],
        ...paginationMeta(pagination.page, pagination.pageSize, 0),
      },
      error: null,
    };
  }

  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("boq_measurements")
    .select(
      "id, measurement_date, quantity, unit, location, description, reference, boq_item_id",
    )
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id)
    .eq("boq_id", boq.id)
    .eq("status", "active")
    .order("measurement_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(pagination.from, pagination.to);

  if (error) {
    return { result: null, error: GENERIC_ERROR };
  }

  const itemNames = new Map(
    boq.items.map((item) => [item.id, item.description]),
  );

  return {
    result: {
      items: (data ?? []).map((row) => ({
        id: row.id,
        measurement_date: row.measurement_date,
        quantity: quantityString(row.quantity),
        unit: row.unit,
        location: row.location,
        description: row.description,
        reference: row.reference,
        item_description: itemNames.get(row.boq_item_id) ?? "Work item",
      })),
      ...paginationMeta(pagination.page, pagination.pageSize, count ?? 0),
    },
    error: null,
  };
}

export async function getPreviewClientPortalQuotation(
  projectId: string,
): Promise<
  | { quotation: ClientPortalQuotation | null; error: null }
  | { quotation: null; error: "unavailable" | string }
> {
  const session = await getPreviewClientPortalSession(projectId);

  if (session.status !== "ok" || !session.settings.show_quotation) {
    return { quotation: null, error: "unavailable" };
  }

  const latest = await getLatestAcceptedQuotationForProject(projectId);

  if (latest.error === "not_found") {
    return { quotation: null, error: "unavailable" };
  }

  if (latest.error) {
    return { quotation: null, error: GENERIC_ERROR };
  }

  if (!latest.quotation) {
    return { quotation: null, error: null };
  }

  const detail = await getQuotationById(latest.quotation.id);

  if (detail.error || !detail.quotation) {
    return { quotation: null, error: detail.error ? GENERIC_ERROR : null };
  }

  return {
    quotation: {
      quotation_number: detail.quotation.quotation_number,
      title: detail.quotation.title,
      quotation_date: detail.quotation.quotation_date,
      valid_until: detail.quotation.valid_until,
      client_name: detail.quotation.client_name,
      client_phone: detail.quotation.client_phone,
      client_email: detail.quotation.client_email,
      client_address: detail.quotation.client_address,
      subtotal: detail.quotation.subtotal,
      discount_type: detail.quotation.discount_type,
      discount_value: detail.quotation.discount_value,
      discount_amount: detail.quotation.discount_amount,
      tax_percentage: detail.quotation.tax_percentage,
      tax_amount: detail.quotation.tax_amount,
      total_amount: detail.quotation.total_amount,
      notes: detail.quotation.notes,
      terms: detail.quotation.terms,
      items: detail.quotation.items.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total_amount: item.total_amount,
      })),
    },
    error: null,
  };
}

export async function getPreviewClientPortalCost(
  projectId: string,
): Promise<
  | { cost: ClientPortalCostSummary | null; error: null }
  | { cost: null; error: "unavailable" | string }
> {
  const session = await getPreviewClientPortalSession(projectId);

  if (session.status !== "ok" || !session.settings.show_project_cost) {
    return { cost: null, error: "unavailable" };
  }

  const result = await getProjectCostTotals(projectId);

  if (result.error === "not_found") {
    return { cost: null, error: "unavailable" };
  }

  if (result.error || !result.totals) {
    return { cost: null, error: GENERIC_ERROR };
  }

  return { cost: result.totals, error: null };
}

export async function getClientPortalEnabledCount(): Promise<{
  count: number;
  error: string | null;
}> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("project_client_access")
    .select("project_id", { count: "exact", head: true })
    .eq("is_active", true);

  if (error) {
    return { count: 0, error: getClientPortalErrorMessage(error) };
  }

  return { count: count ?? 0, error: null };
}
