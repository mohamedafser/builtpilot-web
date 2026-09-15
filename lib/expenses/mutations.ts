import { isExpensePaymentMethod } from "@/constants/expense";
import { getCurrentUser } from "@/lib/auth";
import {
  emptyToNull,
  getExpenseErrorMessage,
  isUuid,
  type ExpenseMutationResult,
} from "@/lib/expenses/helpers";
import type { ExpensePaymentMethod } from "@/types";
import { getExpenseById } from "@/lib/expenses/queries";
import { getProjectById } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import {
  createExpenseSchema,
  updateExpenseSchema,
} from "@/lib/validations/expense";
import { getZodErrorMessage } from "@/lib/validations/error";

function parsePaymentMethod(value: string | undefined): ExpensePaymentMethod | null {
  if (!value || !isExpensePaymentMethod(value)) {
    return null;
  }

  return value;
}

async function assertVendorInBusiness(
  vendorId: string | null,
  businessId: string,
): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  if (!vendorId) {
    return { ok: true };
  }

  if (!isUuid(vendorId)) {
    return { ok: false, error: "Select a valid vendor." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("id")
    .eq("id", vendorId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: getExpenseErrorMessage(error) };
  }

  if (!data) {
    return {
      ok: false,
      error: "That vendor was not found in this workspace.",
      status: 400,
    };
  }

  return { ok: true };
}

export async function createProjectExpense(
  projectId: string,
  values: unknown,
): Promise<ExpenseMutationResult> {
  if (!isUuid(projectId)) {
    return { error: "Project not found.", status: 404 };
  }

  const parsed = createExpenseSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Check the expense details."),
    };
  }

  const user = await getCurrentUser();

  if (!user) {
    return { error: "You must be signed in to continue.", status: 401 };
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

  const vendorId = emptyToNull(parsed.data.vendor_id);
  const vendorCheck = await assertVendorInBusiness(
    vendorId,
    projectResult.project.business_id,
  );

  if (!vendorCheck.ok) {
    return { error: vendorCheck.error, status: vendorCheck.status };
  }

  const paymentMethod = parsePaymentMethod(parsed.data.payment_method);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_expenses")
    .insert({
      business_id: projectResult.project.business_id,
      project_id: projectId,
      vendor_id: vendorId,
      category: parsed.data.category,
      description: parsed.data.description,
      amount: parsed.data.amount,
      expense_date: parsed.data.expense_date,
      payment_method: paymentMethod,
      reference_number: emptyToNull(parsed.data.reference_number),
      notes: emptyToNull(parsed.data.notes),
      status: "active",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      error: error
        ? getExpenseErrorMessage(error)
        : "Unable to save this expense.",
    };
  }

  return { success: true, id: data.id };
}

export async function updateProjectExpense(
  projectId: string,
  expenseId: string,
  values: unknown,
): Promise<ExpenseMutationResult> {
  if (!isUuid(projectId) || !isUuid(expenseId)) {
    return { error: "Expense not found.", status: 404 };
  }

  const parsed = updateExpenseSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Check the expense details."),
    };
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
    return { error: "Voided expenses cannot be edited." };
  }

  const vendorId = emptyToNull(parsed.data.vendor_id);
  const vendorCheck = await assertVendorInBusiness(
    vendorId,
    existing.expense.business_id,
  );

  if (!vendorCheck.ok) {
    return { error: vendorCheck.error, status: vendorCheck.status };
  }

  const paymentMethod = parsePaymentMethod(parsed.data.payment_method);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_expenses")
    .update({
      vendor_id: vendorId,
      category: parsed.data.category,
      description: parsed.data.description,
      amount: parsed.data.amount,
      expense_date: parsed.data.expense_date,
      payment_method: paymentMethod,
      reference_number: emptyToNull(parsed.data.reference_number),
      notes: emptyToNull(parsed.data.notes),
    })
    .eq("id", expenseId)
    .eq("project_id", projectId)
    .eq("business_id", existing.expense.business_id)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getExpenseErrorMessage(error) };
  }

  if (!data) {
    return { error: "Expense not found.", status: 404 };
  }

  return { success: true, id: data.id };
}

export async function voidProjectExpense(
  projectId: string,
  expenseId: string,
): Promise<ExpenseMutationResult> {
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
    return { error: "This expense is already voided." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_expenses")
    .update({ status: "void" })
    .eq("id", expenseId)
    .eq("project_id", projectId)
    .eq("business_id", existing.expense.business_id)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: getExpenseErrorMessage(error) };
  }

  if (!data) {
    return { error: "Expense not found.", status: 404 };
  }

  return { success: true, id: data.id };
}
