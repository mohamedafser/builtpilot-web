import { getWorkspaceScope } from "@/lib/projects/queries";
import { getWorkerById } from "@/lib/workers/queries";
import {
  emptyToNull,
  getWorkerErrorMessage,
  isUuid,
  type WorkerMutationResult,
} from "@/lib/workers/helpers";
import { createClient } from "@/lib/supabase/server";
import {
  createWorkerSchema,
  updateWorkerSchema,
  type CreateWorkerFormValues,
} from "@/lib/validations/worker";
import { getZodErrorMessage } from "@/lib/validations/error";

function workerWritePayload(values: CreateWorkerFormValues) {
  return {
    name: values.name,
    phone: emptyToNull(values.phone),
    role: values.role,
    daily_wage: values.daily_wage,
    notes: emptyToNull(values.notes),
  };
}

export async function createWorker(
  values: unknown,
): Promise<WorkerMutationResult> {
  const parsed = createWorkerSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Invalid worker details."),
    };
  }

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { error: scope.message, status: 401 };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workers")
    .insert({
      business_id: scope.business.id,
      status: "active",
      ...workerWritePayload(parsed.data),
    })
    .select("id")
    .single();

  if (error) {
    return { error: getWorkerErrorMessage(error) };
  }

  return { success: true, id: data.id };
}

export async function updateWorker(
  id: string,
  values: unknown,
): Promise<WorkerMutationResult> {
  if (!isUuid(id)) {
    return { error: "Worker not found.", status: 404 };
  }

  const parsed = updateWorkerSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Invalid worker details."),
    };
  }

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { error: scope.message, status: 401 };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workers")
    .update({
      ...workerWritePayload(parsed.data),
      status: parsed.data.status,
    })
    .eq("id", id)
    .eq("business_id", scope.business.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getWorkerErrorMessage(error) };
  }

  if (!data) {
    return { error: "Worker not found.", status: 404 };
  }

  return { success: true, id: data.id };
}

export async function deactivateWorker(
  id: string,
): Promise<WorkerMutationResult> {
  return setWorkerStatus(id, "inactive");
}

export async function reactivateWorker(
  id: string,
): Promise<WorkerMutationResult> {
  return setWorkerStatus(id, "active");
}

async function setWorkerStatus(
  id: string,
  status: "active" | "inactive",
): Promise<WorkerMutationResult> {
  if (!isUuid(id)) {
    return { error: "Worker not found.", status: 404 };
  }

  const existing = await getWorkerById(id);

  if (existing.error === "not_found" || !existing.worker) {
    return {
      error:
        existing.error === "not_found"
          ? "Worker not found."
          : existing.error ?? "Worker not found.",
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workers")
    .update({ status })
    .eq("id", id)
    .eq("business_id", existing.worker.business_id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getWorkerErrorMessage(error) };
  }

  if (!data) {
    return { error: "Worker not found.", status: 404 };
  }

  return { success: true, id: data.id };
}
