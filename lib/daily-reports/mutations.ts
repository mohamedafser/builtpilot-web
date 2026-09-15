import { MANPOWER_ROLES, type ManpowerCounts } from "@/constants/daily-report";
import {
  emptyToNull,
  getDailyReportErrorMessage,
  isUuid,
  type DailyReportMutationResult,
} from "@/lib/daily-reports/helpers";
import { getCurrentUser } from "@/lib/auth";
import { createBusinessNotifications } from "@/lib/notifications/create";
import { getProjectById } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/types";
import {
  dailyReportSchema,
  isIsoDateOnOrAfter,
  isIsoDateOnOrBefore,
  parseManpowerCounts,
  todayIsoDate,
  type DailyReportFormValues,
  type MaterialEntryValues,
} from "@/lib/validations/daily-report";
import { getZodErrorMessage } from "@/lib/validations/error";

function reportWritePayload(values: DailyReportFormValues) {
  return {
    report_date: values.report_date,
    weather: emptyToNull(values.weather),
    work_completed: values.work_completed.trim(),
    issues: emptyToNull(values.issues),
    tomorrow_plan: emptyToNull(values.tomorrow_plan),
    general_notes: emptyToNull(values.general_notes),
  };
}

function validateReportDate(
  reportDate: string,
  startDate: string | null,
): string | null {
  if (!isIsoDateOnOrBefore(reportDate, todayIsoDate())) {
    return "Report date cannot be in the future.";
  }

  if (startDate && !isIsoDateOnOrAfter(reportDate, startDate)) {
    return "Report date cannot be before the project start date.";
  }

  return null;
}

async function scopedProject(projectId: string): Promise<
  | { ok: true; project: Project }
  | { ok: false; error: string; status: 400 | 404 }
> {
  if (!isUuid(projectId)) {
    return { ok: false, error: "Project not found.", status: 404 };
  }

  const result = await getProjectById(projectId);

  if (result.error === "not_found" || !result.project) {
    return {
      ok: false,
      error: result.error === "not_found" ? "Project not found." : result.error,
      status: result.error === "not_found" ? 404 : 400,
    };
  }

  return { ok: true, project: result.project };
}

export async function createDailyReport(
  projectId: string,
  values: unknown,
): Promise<DailyReportMutationResult> {
  const parsed = dailyReportSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Invalid daily report details."),
    };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "You must be signed in to continue.", status: 401 };
  }

  const scoped = await scopedProject(projectId);

  if (!scoped.ok) {
    return { error: scoped.error, status: scoped.status };
  }

  const dateError = validateReportDate(
    parsed.data.report_date,
    scoped.project.start_date,
  );

  if (dateError) {
    return { error: dateError };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_site_reports")
    .insert({
      project_id: scoped.project.id,
      business_id: scoped.project.business_id,
      created_by: user.id,
      ...reportWritePayload(parsed.data),
    })
    .select("id")
    .single();

  if (error) {
    return { error: getDailyReportErrorMessage(error) };
  }

  const manpowerError = await saveReportManpower(
    projectId,
    data.id,
    parseManpowerCounts(parsed.data.manpower),
  );

  if (manpowerError) {
    await supabase
      .from("daily_site_reports")
      .delete()
      .eq("id", data.id)
      .eq("business_id", scoped.project.business_id);
    return { error: manpowerError };
  }

  const materialsError = await saveReportMaterials(
    projectId,
    data.id,
    parsed.data.materials,
  );

  if (materialsError) {
    await supabase
      .from("daily_site_reports")
      .delete()
      .eq("id", data.id)
      .eq("business_id", scoped.project.business_id);
    return { error: materialsError };
  }

  void createBusinessNotifications({
    businessId: scoped.project.business_id,
    projectId: scoped.project.id,
    type: "daily_report",
    title: "Daily report added",
    message: `Daily report added for ${scoped.project.name}.`,
    actionUrl: `/projects/${scoped.project.id}/reports/${data.id}`,
    dedupeKey: `daily_report:${data.id}`,
    preferenceKey: "daily_report_notifications",
  });

  return { success: true, id: data.id };
}

export async function updateDailyReport(
  projectId: string,
  reportId: string,
  values: unknown,
): Promise<DailyReportMutationResult> {
  if (!isUuid(reportId)) {
    return { error: "Daily report not found.", status: 404 };
  }

  const parsed = dailyReportSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Invalid daily report details."),
    };
  }

  const scoped = await scopedProject(projectId);

  if (!scoped.ok) {
    return { error: scoped.error, status: scoped.status };
  }

  const dateError = validateReportDate(
    parsed.data.report_date,
    scoped.project.start_date,
  );

  if (dateError) {
    return { error: dateError };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_site_reports")
    .update(reportWritePayload(parsed.data))
    .eq("id", reportId)
    .eq("project_id", projectId)
    .eq("business_id", scoped.project.business_id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getDailyReportErrorMessage(error) };
  }

  if (!data) {
    return { error: "Daily report not found.", status: 404 };
  }

  const manpowerError = await saveReportManpower(
    projectId,
    reportId,
    parseManpowerCounts(parsed.data.manpower),
  );

  if (manpowerError) {
    return { error: manpowerError, id: reportId };
  }

  const materialsError = await saveReportMaterials(
    projectId,
    reportId,
    parsed.data.materials,
  );

  if (materialsError) {
    return { error: materialsError, id: reportId };
  }

  return { success: true, id: data.id };
}

export async function archiveDailyReport(
  projectId: string,
  reportId: string,
): Promise<DailyReportMutationResult> {
  return setArchivedAt(projectId, reportId, new Date().toISOString());
}

export async function restoreDailyReport(
  projectId: string,
  reportId: string,
): Promise<DailyReportMutationResult> {
  return setArchivedAt(projectId, reportId, null);
}

async function setArchivedAt(
  projectId: string,
  reportId: string,
  archivedAt: string | null,
): Promise<DailyReportMutationResult> {
  if (!isUuid(reportId)) {
    return { error: "Daily report not found.", status: 404 };
  }

  const scoped = await scopedProject(projectId);

  if (!scoped.ok) {
    return { error: scoped.error, status: scoped.status };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_site_reports")
    .update({ archived_at: archivedAt })
    .eq("id", reportId)
    .eq("project_id", projectId)
    .eq("business_id", scoped.project.business_id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getDailyReportErrorMessage(error) };
  }

  if (!data) {
    return { error: "Daily report not found.", status: 404 };
  }

  return { success: true, id: data.id };
}

export async function saveReportManpower(
  projectId: string,
  reportId: string,
  counts: ManpowerCounts,
): Promise<string | null> {
  const scoped = await scopedProject(projectId);

  if (!scoped.ok) {
    return scoped.error;
  }

  if (!isUuid(reportId)) {
    return "Daily report not found.";
  }

  const supabase = await createClient();
  const { data: report, error: reportError } = await supabase
    .from("daily_site_reports")
    .select("id")
    .eq("id", reportId)
    .eq("project_id", projectId)
    .eq("business_id", scoped.project.business_id)
    .maybeSingle();

  if (reportError) {
    return getDailyReportErrorMessage(reportError);
  }

  if (!report) {
    return "Daily report not found.";
  }

  const { error: deleteError } = await supabase
    .from("daily_report_manpower")
    .delete()
    .eq("daily_report_id", reportId);

  if (deleteError) {
    return getDailyReportErrorMessage(deleteError);
  }

  const rows = MANPOWER_ROLES.filter((role) => counts[role] > 0).map(
    (role) => ({
      daily_report_id: reportId,
      role,
      worker_count: counts[role],
    }),
  );

  if (rows.length === 0) {
    return null;
  }

  const { error } = await supabase.from("daily_report_manpower").insert(rows);

  if (error) {
    return getDailyReportErrorMessage(error);
  }

  return null;
}

export async function saveReportMaterials(
  projectId: string,
  reportId: string,
  materials: MaterialEntryValues[],
): Promise<string | null> {
  const scoped = await scopedProject(projectId);

  if (!scoped.ok) {
    return scoped.error;
  }

  if (!isUuid(reportId)) {
    return "Daily report not found.";
  }

  const supabase = await createClient();
  const { data: report, error: reportError } = await supabase
    .from("daily_site_reports")
    .select("id")
    .eq("id", reportId)
    .eq("project_id", projectId)
    .eq("business_id", scoped.project.business_id)
    .maybeSingle();

  if (reportError) {
    return getDailyReportErrorMessage(reportError);
  }

  if (!report) {
    return "Daily report not found.";
  }

  const { error: deleteError } = await supabase
    .from("daily_report_materials")
    .delete()
    .eq("daily_report_id", reportId);

  if (deleteError) {
    return getDailyReportErrorMessage(deleteError);
  }

  const rows = materials.map((material) => ({
    daily_report_id: reportId,
    material_name: material.material_name.trim(),
    quantity: Number(material.quantity),
    unit: material.unit.trim(),
    type: material.type,
  }));

  if (rows.length === 0) {
    return null;
  }

  const { error } = await supabase.from("daily_report_materials").insert(rows);

  if (error) {
    return getDailyReportErrorMessage(error);
  }

  return null;
}
