import {
  calculateAttendanceWage,
  dayRateFromAttendance,
  todayIsoDate,
} from "@/lib/labour/money";
import {
  emptyToNull,
  getLabourErrorMessage,
  isUuid,
  type LabourMutationResult,
} from "@/lib/labour/helpers";
import { getProjectWorkers } from "@/lib/labour/queries";
import {
  completeReviewLabourAction,
  createReviewLabourAction,
} from "@/lib/project-actions/workflows";
import { getProjectById, getWorkspaceScope } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import {
  assignWorkerToProjectsSchema,
  assignWorkersSchema,
  assignWorkersToProjectsSchema,
  saveAttendanceSchema,
} from "@/lib/validations/labour";
import { getZodErrorMessage } from "@/lib/validations/error";
import { getWorkerById } from "@/lib/workers/queries";
import type { AttendanceStatus, Worker } from "@/types";

export async function assignWorkersToProject(
  projectId: string,
  values: unknown,
): Promise<LabourMutationResult> {
  if (!isUuid(projectId)) {
    return { error: "Project not found.", status: 404 };
  }

  const parsed = assignWorkersSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Select at least one worker."),
    };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      error:
        projectResult.error === "not_found"
          ? "Project not found."
          : projectResult.error,
      status: projectResult.error === "not_found" ? 404 : 400,
    };
  }

  const uniqueIds = [...new Set(parsed.data.worker_ids)];
  const supabase = await createClient();
  const { data: workers, error: workersError } = await supabase
    .from("workers")
    .select("id, business_id, status")
    .in("id", uniqueIds)
    .eq("business_id", projectResult.project.business_id);

  if (workersError) {
    return { error: getLabourErrorMessage(workersError) };
  }

  if (!workers || workers.length !== uniqueIds.length) {
    return {
      error: "One or more workers were not found in this workspace.",
      status: 400,
    };
  }

  const inactive = workers.find((worker) => worker.status !== "active");

  if (inactive) {
    return {
      error: "Inactive workers cannot be assigned to a project.",
      status: 400,
    };
  }

  const { data: existing, error: existingError } = await supabase
    .from("project_workers")
    .select("id, worker_id, status")
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id)
    .in("worker_id", uniqueIds);

  if (existingError) {
    return { error: getLabourErrorMessage(existingError) };
  }

  const existingByWorker = new Map(
    (existing ?? []).map((row) => [row.worker_id, row]),
  );
  const toInsert: string[] = [];
  const toReactivate: string[] = [];
  const alreadyAssigned: string[] = [];

  for (const workerId of uniqueIds) {
    const current = existingByWorker.get(workerId);

    if (!current) {
      toInsert.push(workerId);
      continue;
    }

    if (current.status === "active") {
      alreadyAssigned.push(workerId);
      continue;
    }

    toReactivate.push(current.id);
  }

  if (
    alreadyAssigned.length === uniqueIds.length &&
    toInsert.length === 0 &&
    toReactivate.length === 0
  ) {
    return {
      error: "Selected workers are already assigned to this project.",
      status: 409,
    };
  }

  const assignedFrom = todayIsoDate();

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from("project_workers").insert(
      toInsert.map((workerId) => ({
        project_id: projectId,
        worker_id: workerId,
        business_id: projectResult.project.business_id,
        assigned_from: assignedFrom,
        assigned_until: null,
        status: "active" as const,
      })),
    );

    if (insertError) {
      return { error: getLabourErrorMessage(insertError) };
    }
  }

  if (toReactivate.length > 0) {
    const { error: updateError } = await supabase
      .from("project_workers")
      .update({
        status: "active",
        assigned_from: assignedFrom,
        assigned_until: null,
      })
      .in("id", toReactivate)
      .eq("project_id", projectId)
      .eq("business_id", projectResult.project.business_id);

    if (updateError) {
      return { error: getLabourErrorMessage(updateError) };
    }
  }

  const changedCount = toInsert.length + toReactivate.length;

  if (changedCount > 0) {
    void createReviewLabourAction({
      businessId: projectResult.project.business_id,
      projectId,
      workerCount: changedCount,
    });
  }

  return {
    success: true,
    ids: [...toInsert, ...toReactivate],
  };
}

export async function assignWorkerToProjects(
  workerId: string,
  values: unknown,
): Promise<LabourMutationResult> {
  if (!isUuid(workerId)) {
    return { error: "Worker not found.", status: 404 };
  }

  const parsed = assignWorkerToProjectsSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Select at least one project."),
    };
  }

  const workerResult = await getWorkerById(workerId);

  if (workerResult.error === "not_found" || !workerResult.worker) {
    return {
      error:
        workerResult.error === "not_found"
          ? "Worker not found."
          : workerResult.error,
      status: workerResult.error === "not_found" ? 404 : 400,
    };
  }

  if (workerResult.worker.status !== "active") {
    return {
      error: "Inactive workers cannot be assigned to a project.",
      status: 400,
    };
  }

  const uniqueProjectIds = [...new Set(parsed.data.project_ids)];
  const assignedIds: string[] = [];

  for (const projectId of uniqueProjectIds) {
    const result = await assignWorkersToProject(projectId, {
      worker_ids: [workerId],
    });

    if ("error" in result) {
      if (result.status === 409) {
        continue;
      }

      return result;
    }

    assignedIds.push(projectId);
  }

  if (assignedIds.length === 0) {
    return {
      error: "This worker is already assigned to the selected projects.",
      status: 409,
    };
  }

  return { success: true, ids: assignedIds };
}

export async function assignWorkersToProjects(
  values: unknown,
): Promise<LabourMutationResult> {
  const parsed = assignWorkersToProjectsSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(
        parsed.error,
        "Select at least one worker and one project.",
      ),
    };
  }

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return {
      error: scope.message,
      status:
        scope.message === "You must be signed in to continue." ? 401 : 400,
    };
  }

  const uniqueWorkerIds = [...new Set(parsed.data.worker_ids)];
  const uniqueProjectIds = [...new Set(parsed.data.project_ids)];
  const supabase = await createClient();

  const { data: workers, error: workersError } = await supabase
    .from("workers")
    .select("id, status")
    .in("id", uniqueWorkerIds)
    .eq("business_id", scope.business.id);

  if (workersError) {
    return { error: getLabourErrorMessage(workersError) };
  }

  if (!workers || workers.length !== uniqueWorkerIds.length) {
    return {
      error: "One or more workers were not found in this workspace.",
      status: 400,
    };
  }

  if (workers.some((worker) => worker.status !== "active")) {
    return {
      error: "Inactive workers cannot be assigned to a project.",
      status: 400,
    };
  }

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id, archived_at")
    .in("id", uniqueProjectIds)
    .eq("business_id", scope.business.id);

  if (projectsError) {
    return { error: getLabourErrorMessage(projectsError) };
  }

  if (!projects || projects.length !== uniqueProjectIds.length) {
    return {
      error: "One or more projects were not found in this workspace.",
      status: 400,
    };
  }

  if (projects.some((project) => project.archived_at)) {
    return {
      error: "Archived projects cannot receive new assignments.",
      status: 400,
    };
  }

  const assignedProjectIds: string[] = [];

  for (const projectId of uniqueProjectIds) {
    const result = await assignWorkersToProject(projectId, {
      worker_ids: uniqueWorkerIds,
    });

    if ("error" in result) {
      if (result.status === 409) {
        continue;
      }

      return result;
    }

    assignedProjectIds.push(projectId);
  }

  if (assignedProjectIds.length === 0) {
    return {
      error: "Selected workers are already assigned to the selected projects.",
      status: 409,
    };
  }

  return { success: true, ids: assignedProjectIds };
}

export async function removeWorkerFromProject(
  projectId: string,
  assignmentId: string,
): Promise<LabourMutationResult> {
  if (!isUuid(projectId) || !isUuid(assignmentId)) {
    return { error: "Assignment not found.", status: 404 };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      error:
        projectResult.error === "not_found"
          ? "Project not found."
          : projectResult.error,
      status: projectResult.error === "not_found" ? 404 : 400,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_workers")
    .update({
      status: "inactive",
      assigned_until: todayIsoDate(),
    })
    .eq("id", assignmentId)
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getLabourErrorMessage(error) };
  }

  if (!data) {
    return { error: "Assignment not found.", status: 404 };
  }

  return { success: true, id: data.id };
}

export async function saveAttendance(
  projectId: string,
  values: unknown,
): Promise<LabourMutationResult> {
  if (!isUuid(projectId)) {
    return { error: "Project not found.", status: 404 };
  }

  const parsed = saveAttendanceSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Invalid attendance details."),
    };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      error:
        projectResult.error === "not_found"
          ? "Project not found."
          : projectResult.error,
      status: projectResult.error === "not_found" ? 404 : 400,
    };
  }

  const assigned = await getProjectWorkers(projectId);

  if (assigned.error === "not_found") {
    return { error: "Project not found.", status: 404 };
  }

  if (assigned.error) {
    return { error: assigned.error };
  }

  const assignedById = new Map(
    assigned.assignments.map((assignment) => [
      assignment.worker.id,
      assignment.worker,
    ]),
  );

  for (const entry of parsed.data.entries) {
    const worker = assignedById.get(entry.worker_id);

    if (!worker) {
      return {
        error: "Attendance can only be recorded for workers assigned to this project.",
        status: 400,
      };
    }

    if (worker.business_id !== projectResult.project.business_id) {
      return {
        error: "Worker does not belong to this workspace.",
        status: 400,
      };
    }
  }

  const supabase = await createClient();
  const { data: existingRows, error: existingError } = await supabase
    .from("worker_attendance")
    .select("id, worker_id, status, wage")
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id)
    .eq("attendance_date", parsed.data.attendance_date)
    .in(
      "worker_id",
      parsed.data.entries.map((entry) => entry.worker_id),
    );

  if (existingError) {
    return { error: getLabourErrorMessage(existingError) };
  }

  const existingByWorker = new Map(
    (existingRows ?? []).map((row) => [row.worker_id, row]),
  );

  const payload = parsed.data.entries.map((entry) => {
    const worker = assignedById.get(entry.worker_id) as Worker;
    const existing = existingByWorker.get(entry.worker_id);
    const dayRate = existing
      ? dayRateFromAttendance(
          existing.status as AttendanceStatus,
          existing.wage,
          worker.daily_wage,
        )
      : worker.daily_wage;

    return {
      business_id: projectResult.project.business_id,
      project_id: projectId,
      worker_id: entry.worker_id,
      attendance_date: parsed.data.attendance_date,
      status: entry.status,
      hours_worked: emptyToNull(entry.hours_worked),
      wage: calculateAttendanceWage(dayRate, entry.status),
      notes: emptyToNull(entry.notes),
    };
  });

  const { error } = await supabase.from("worker_attendance").upsert(payload, {
    onConflict: "project_id,worker_id,attendance_date",
  });

  if (error) {
    return { error: getLabourErrorMessage(error) };
  }

  void completeReviewLabourAction(projectId);

  return { success: true };
}
