import {
  ACCEPTED_EXPENSE_RECEIPT_TYPES,
  EXPENSE_RECEIPT_BUCKET,
  MAX_EXPENSE_RECEIPT_BYTES,
} from "@/constants/expense";
import { getCurrentUser } from "@/lib/auth";
import {
  getExpenseErrorMessage,
  isUuid,
  sanitizeFileName,
} from "@/lib/expenses/helpers";
import { getExpenseById } from "@/lib/expenses/queries";
import { getProjectById } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import type { ProjectExpense } from "@/types";

const ALLOWED_TYPES = new Set<string>(ACCEPTED_EXPENSE_RECEIPT_TYPES);

export type ReceiptMutationResult =
  | { error: string; status?: number }
  | { success: true; expense: ProjectExpense };

function isAllowedReceipt(file: File): boolean {
  if (ALLOWED_TYPES.has(file.type.toLowerCase())) {
    return true;
  }

  const name = file.name.toLowerCase();
  return (
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp") ||
    name.endsWith(".pdf")
  );
}

function contentTypeFor(file: File): string {
  if (file.type) {
    return file.type;
  }

  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (name.endsWith(".png")) {
    return "image/png";
  }

  if (name.endsWith(".webp")) {
    return "image/webp";
  }

  return "image/jpeg";
}

export async function uploadExpenseReceipt(
  projectId: string,
  expenseId: string,
  file: File,
): Promise<ReceiptMutationResult> {
  if (!isUuid(projectId) || !isUuid(expenseId)) {
    return { error: "Expense not found.", status: 404 };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a receipt to upload." };
  }

  if (!isAllowedReceipt(file)) {
    return {
      error: "That file type is not supported. Use JPEG, PNG, WebP, or PDF.",
    };
  }

  if (file.size > MAX_EXPENSE_RECEIPT_BYTES) {
    return { error: "That receipt is too large. Use a file under 10 MB." };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "You must be signed in to continue.", status: 401 };
  }

  const existing = await getExpenseById(projectId, expenseId);

  if (existing.error === "not_found" || !existing.expense) {
    return {
      error:
        existing.error === "not_found" ? "Expense not found." : existing.error,
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  if (existing.expense.status === "void") {
    return { error: "Receipts cannot be changed on a voided expense." };
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
  const fileName = sanitizeFileName(file.name);
  const storagePath = `business/${projectResult.project.business_id}/projects/${projectId}/expenses/${expenseId}/${fileName}`;
  const previousPath = existing.expense.receipt_path;

  const { error: uploadError } = await supabase.storage
    .from(EXPENSE_RECEIPT_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: contentTypeFor(file),
    });

  if (uploadError) {
    return { error: getExpenseErrorMessage(uploadError) };
  }

  const { data, error } = await supabase
    .from("project_expenses")
    .update({ receipt_path: storagePath })
    .eq("id", expenseId)
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    await supabase.storage.from(EXPENSE_RECEIPT_BUCKET).remove([storagePath]);
    return {
      error: error
        ? getExpenseErrorMessage(error)
        : "Unable to save receipt details.",
    };
  }

  if (previousPath && previousPath !== storagePath) {
    await supabase.storage.from(EXPENSE_RECEIPT_BUCKET).remove([previousPath]);
  }

  return { success: true, expense: data };
}

export async function deleteExpenseReceipt(
  projectId: string,
  expenseId: string,
): Promise<{ error: string; status?: number } | { success: true }> {
  if (!isUuid(projectId) || !isUuid(expenseId)) {
    return { error: "Expense not found.", status: 404 };
  }

  const existing = await getExpenseById(projectId, expenseId);

  if (existing.error === "not_found" || !existing.expense) {
    return {
      error:
        existing.error === "not_found" ? "Expense not found." : existing.error,
      status: existing.error === "not_found" ? 404 : 400,
    };
  }

  if (existing.expense.status === "void") {
    return { error: "Receipts cannot be changed on a voided expense." };
  }

  if (!existing.expense.receipt_path) {
    return { error: "This expense does not have a receipt." };
  }

  const supabase = await createClient();
  const { error: storageError } = await supabase.storage
    .from(EXPENSE_RECEIPT_BUCKET)
    .remove([existing.expense.receipt_path]);

  if (storageError) {
    return { error: getExpenseErrorMessage(storageError) };
  }

  const { error } = await supabase
    .from("project_expenses")
    .update({ receipt_path: null })
    .eq("id", expenseId)
    .eq("project_id", projectId)
    .eq("business_id", existing.expense.business_id);

  if (error) {
    return { error: getExpenseErrorMessage(error) };
  }

  return { success: true };
}
