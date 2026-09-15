import { cache } from "react";
import { emptyManpowerCounts, totalManpower } from "@/constants/daily-report";
import {
  paginationMeta,
  type Pagination,
  type PaginationMeta,
} from "@/lib/api/pagination";
import {
  getDailyReportErrorMessage,
  isUuid,
  sanitizeSearchTerm,
} from "@/lib/daily-reports/helpers";
import type {
  DailyReportDetail,
  DailyReportFilters,
  DailyReportListItem,
  DailyReportStats,
  SitePhotoWithUrl,
} from "@/lib/daily-reports/types";
import { getProjectById, getWorkspaceScope } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import type {
  DailyReportManpower,
  DailyReportMaterial,
  DailySiteReport,
} from "@/types";

export type {
  DailyReportDetail,
  DailyReportFilters,
  DailyReportListItem,
  DailyReportStats,
  SitePhotoWithUrl,
};

function isIsoDate(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function parseDailyReportSearchParams(searchParams: {
  q?: string;
  from?: string;
  to?: string;
  archived?: string;
}): DailyReportFilters {
  return {
    query: searchParams.q?.trim() || undefined,
    from: isIsoDate(searchParams.from) ? searchParams.from : undefined,
    to: isIsoDate(searchParams.to) ? searchParams.to : undefined,
    archived: searchParams.archived === "1" || searchParams.archived === "true",
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

async function attachListMeta(
  reports: DailySiteReport[],
): Promise<DailyReportListItem[]> {
  if (reports.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const reportIds = reports.map((report) => report.id);
  const [names, photosResult, manpowerResult] = await Promise.all([
    loadCreatorNames(reports.map((report) => report.created_by)),
    supabase
      .from("site_photos")
      .select("daily_report_id")
      .in("daily_report_id", reportIds),
    supabase
      .from("daily_report_manpower")
      .select("daily_report_id, worker_count")
      .in("daily_report_id", reportIds),
  ]);

  const photoCounts = new Map<string, number>();
  for (const photo of photosResult.data ?? []) {
    if (!photo.daily_report_id) {
      continue;
    }
    photoCounts.set(
      photo.daily_report_id,
      (photoCounts.get(photo.daily_report_id) ?? 0) + 1,
    );
  }

  const workerCounts = new Map<string, number>();
  for (const row of manpowerResult.data ?? []) {
    workerCounts.set(
      row.daily_report_id,
      (workerCounts.get(row.daily_report_id) ?? 0) + row.worker_count,
    );
  }

  return reports.map((report) => ({
    ...report,
    created_by_name: names.get(report.created_by) ?? null,
    photo_count: photoCounts.get(report.id) ?? 0,
    worker_count: workerCounts.get(report.id) ?? 0,
  }));
}

export async function getDailyReports(
  projectId: string,
  filters: DailyReportFilters = {},
  pagination?: Pagination,
): Promise<{
  reports: DailyReportListItem[];
  error: string | null;
} & PaginationMeta> {
  const empty = {
    reports: [] as DailyReportListItem[],
    ...paginationMeta(1, pagination?.pageSize ?? filters.limit ?? 1, 0),
    error: null as string | null,
  };

  if (!isUuid(projectId)) {
    return { ...empty, error: "not_found" };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found") {
    return { ...empty, error: "not_found" };
  }

  if (!projectResult.project) {
    return { ...empty, error: projectResult.error };
  }

  const supabase = await createClient();
  let query = supabase
    .from("daily_site_reports")
    .select("*", { count: "exact" })
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id);

  if (filters.archived) {
    query = query.not("archived_at", "is", null);
  } else {
    query = query.is("archived_at", null);
  }

  if (filters.from) {
    query = query.gte("report_date", filters.from);
  }

  if (filters.to) {
    query = query.lte("report_date", filters.to);
  }

  const search = filters.query ? sanitizeSearchTerm(filters.query) : "";

  if (search) {
    query = query.or(
      `work_completed.ilike.%${search}%,issues.ilike.%${search}%,weather.ilike.%${search}%,tomorrow_plan.ilike.%${search}%`,
    );
  }

  query = query.order("report_date", { ascending: false });

  if (pagination) {
    query = query.range(pagination.from, pagination.to);
  } else if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error, count } = await query;

  if (error) {
    return { ...empty, error: getDailyReportErrorMessage(error) };
  }

  const reports = await attachListMeta(data ?? []);
  const total = pagination
    ? (count ?? reports.length)
    : reports.length;

  return {
    reports,
    error: null,
    ...paginationMeta(
      pagination?.page ?? 1,
      pagination?.pageSize ?? (reports.length || 1),
      total,
    ),
  };
}

export const getDailyReport = cache(async function getDailyReport(
  projectId: string,
  reportId: string,
): Promise<
  | { detail: DailyReportDetail; error: null }
  | { detail: null; error: "not_found" }
  | { detail: null; error: string }
> {
  if (!isUuid(projectId) || !isUuid(reportId)) {
    return { detail: null, error: "not_found" };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found") {
    return { detail: null, error: "not_found" };
  }

  if (!projectResult.project) {
    return { detail: null, error: projectResult.error };
  }

  const supabase = await createClient();
  const { data: report, error } = await supabase
    .from("daily_site_reports")
    .select("*")
    .eq("id", reportId)
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id)
    .maybeSingle();

  if (error) {
    return { detail: null, error: getDailyReportErrorMessage(error) };
  }

  if (!report) {
    return { detail: null, error: "not_found" };
  }

  const [names, manpowerResult, materialsResult, photos] = await Promise.all([
    loadCreatorNames([report.created_by]),
    getReportManpower(projectId, reportId),
    getReportMaterials(projectId, reportId),
    getReportPhotos(projectId, reportId),
  ]);

  if (manpowerResult.error) {
    return { detail: null, error: manpowerResult.error };
  }

  if (materialsResult.error) {
    return { detail: null, error: materialsResult.error };
  }

  if (photos.error) {
    return { detail: null, error: photos.error };
  }

  const manpower_counts = emptyManpowerCounts();
  for (const row of manpowerResult.manpower) {
    manpower_counts[row.role] = row.worker_count;
  }

  return {
    detail: {
      report,
      created_by_name: names.get(report.created_by) ?? null,
      manpower: manpowerResult.manpower,
      manpower_counts,
      worker_count: totalManpower(manpower_counts),
      materials: materialsResult.materials,
      photos: photos.photos,
    },
    error: null,
  };
});

export async function getDailyReportStats(projectId: string): Promise<{
  stats: DailyReportStats;
  error: string | null;
}> {
  const empty: DailyReportStats = { total: 0, latest: null };

  if (!isUuid(projectId)) {
    return { stats: empty, error: "not_found" };
  }

  const { reports, error } = await getDailyReports(projectId, { limit: 1 });

  if (error) {
    return { stats: empty, error };
  }

  const projectResult = await getProjectById(projectId);

  if (!projectResult.project) {
    return { stats: empty, error: projectResult.error };
  }

  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("daily_site_reports")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id)
    .is("archived_at", null);

  if (countError) {
    return { stats: empty, error: getDailyReportErrorMessage(countError) };
  }

  return {
    stats: {
      total: count ?? 0,
      latest: reports[0] ?? null,
    },
    error: null,
  };
}

export const getRecentDailyReports = cache(async function getRecentDailyReports(
  limit = 5,
): Promise<{ reports: DailyReportListItem[]; error: string | null }> {
  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { reports: [], error: scope.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_site_reports")
    .select("*")
    .eq("business_id", scope.business.id)
    .is("archived_at", null)
    .order("report_date", { ascending: false })
    .limit(limit);

  if (error) {
    return { reports: [], error: getDailyReportErrorMessage(error) };
  }

  const reports = await attachListMeta(data ?? []);
  const projectIds = [...new Set(reports.map((report) => report.project_id))];

  if (projectIds.length === 0) {
    return { reports, error: null };
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("business_id", scope.business.id)
    .in("id", projectIds);

  const projectNames = new Map(
    (projects ?? []).map((project) => [project.id, project.name]),
  );

  return {
    reports: reports.map((report) => ({
      ...report,
      project_name: projectNames.get(report.project_id),
    })),
    error: null,
  };
});

export async function getReportManpower(
  projectId: string,
  reportId: string,
): Promise<{ manpower: DailyReportManpower[]; error: string | null }> {
  const scoped = await assertReportScope(projectId, reportId);

  if (!scoped.ok) {
    return { manpower: [], error: scoped.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_report_manpower")
    .select("*")
    .eq("daily_report_id", reportId)
    .order("role");

  if (error) {
    return { manpower: [], error: getDailyReportErrorMessage(error) };
  }

  return { manpower: data ?? [], error: null };
}

export async function getReportMaterials(
  projectId: string,
  reportId: string,
): Promise<{ materials: DailyReportMaterial[]; error: string | null }> {
  const scoped = await assertReportScope(projectId, reportId);

  if (!scoped.ok) {
    return { materials: [], error: scoped.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_report_materials")
    .select("*")
    .eq("daily_report_id", reportId)
    .order("created_at");

  if (error) {
    return { materials: [], error: getDailyReportErrorMessage(error) };
  }

  return { materials: data ?? [], error: null };
}

export async function getReportPhotos(
  projectId: string,
  reportId: string,
): Promise<{ photos: SitePhotoWithUrl[]; error: string | null }> {
  const scoped = await assertReportScope(projectId, reportId);

  if (!scoped.ok) {
    return { photos: [], error: scoped.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_photos")
    .select("*")
    .eq("project_id", projectId)
    .eq("business_id", scoped.businessId)
    .eq("daily_report_id", reportId)
    .order("created_at", { ascending: true });

  if (error) {
    return { photos: [], error: getDailyReportErrorMessage(error) };
  }

  const rows = data ?? [];
  const names = await loadCreatorNames(rows.map((photo) => photo.uploaded_by));
  const paths = rows.map((photo) => photo.storage_path);
  const signedUrls = new Map<string, string>();

  if (paths.length > 0) {
    const { data: signed, error: signedError } = await supabase.storage
      .from("site-photos")
      .createSignedUrls(paths, 60 * 60);

    if (!signedError && signed) {
      for (const item of signed) {
        if (item.path && item.signedUrl) {
          signedUrls.set(item.path, item.signedUrl);
        }
      }
    }
  }

  return {
    photos: rows.map((photo) => ({
      ...photo,
      signed_url: signedUrls.get(photo.storage_path) ?? null,
      uploaded_by_name: names.get(photo.uploaded_by) ?? null,
    })),
    error: null,
  };
}

async function assertReportScope(
  projectId: string,
  reportId: string,
): Promise<
  { ok: true; businessId: string } | { ok: false; error: "not_found" | string }
> {
  if (!isUuid(projectId) || !isUuid(reportId)) {
    return { ok: false, error: "not_found" };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found") {
    return { ok: false, error: "not_found" };
  }

  if (!projectResult.project) {
    return { ok: false, error: projectResult.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_site_reports")
    .select("id")
    .eq("id", reportId)
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id)
    .maybeSingle();

  if (error) {
    return { ok: false, error: getDailyReportErrorMessage(error) };
  }

  if (!data) {
    return { ok: false, error: "not_found" };
  }

  return { ok: true, businessId: projectResult.project.business_id };
}
