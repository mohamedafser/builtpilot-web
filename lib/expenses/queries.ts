import { cache } from "react";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_RECEIPT_BUCKET,
  isExpenseCategory,
  isExpensePaymentMethod,
  isExpenseStatus,
} from "@/constants/expense";
import {
  paginationMeta,
  parsePagination,
  type Pagination,
} from "@/lib/api/pagination";
import {
  getExpenseErrorMessage,
  isUuid,
  sanitizeSearchTerm,
} from "@/lib/expenses/helpers";
import type {
  ExpenseDetail,
  ExpenseFilters,
  ExpenseListItem,
  ExpenseListResult,
  ExpenseStats,
  VendorExpenseListItem,
} from "@/lib/expenses/types";
import { moneyToPaise } from "@/lib/costs/calculations";
import { getProjectCostTotals } from "@/lib/costs/queries";
import {
  formatPaise,
  isIsoDate,
  startOfMonthIso,
  todayIsoDate,
} from "@/lib/labour/money";
import { getProjectById } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import type { ProjectExpense } from "@/types";

type ExpenseJoin = ProjectExpense & {
  vendors: { id: string; name: string } | { id: string; name: string }[] | null;
};

function vendorFromJoin(
  value: ExpenseJoin["vendors"],
): { id: string; name: string } | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function parseOptionalDate(value: string | null | undefined): string | undefined {
  if (value && isIsoDate(value)) {
    return value;
  }

  return undefined;
}

export function parseExpenseSearchParams(searchParams: {
  q?: string;
  from?: string;
  to?: string;
  category?: string;
  vendor_id?: string;
  payment_method?: string;
  status?: string;
}): ExpenseFilters {
  const category = searchParams.category;
  const paymentMethod = searchParams.payment_method;
  const status = searchParams.status;

  return {
    query: searchParams.q?.trim() || undefined,
    from: parseOptionalDate(searchParams.from),
    to: parseOptionalDate(searchParams.to),
    category:
      category && isExpenseCategory(category) ? category : undefined,
    vendorId:
      searchParams.vendor_id && isUuid(searchParams.vendor_id)
        ? searchParams.vendor_id
        : undefined,
    paymentMethod:
      paymentMethod && isExpensePaymentMethod(paymentMethod)
        ? paymentMethod
        : undefined,
    status:
      status === "all"
        ? "all"
        : status && isExpenseStatus(status)
          ? status
          : "active",
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

async function signedReceiptUrls(
  paths: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  const urls = new Map<string, string>();

  if (unique.length === 0) {
    return urls;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(EXPENSE_RECEIPT_BUCKET)
    .createSignedUrls(unique, 60 * 60);

  if (error || !data) {
    return urls;
  }

  for (const item of data) {
    if (item.path && item.signedUrl) {
      urls.set(item.path, item.signedUrl);
    }
  }

  return urls;
}

async function mapExpenseRows(
  rows: ExpenseJoin[],
): Promise<ExpenseListItem[]> {
  const names = await loadCreatorNames(rows.map((row) => row.created_by));
  const receipts = await signedReceiptUrls(
    rows.flatMap((row) => (row.receipt_path ? [row.receipt_path] : [])),
  );

  return rows.map((row) => {
    const vendor = vendorFromJoin(row.vendors);

    return {
      ...row,
      vendor_name: vendor?.name ?? null,
      created_by_name: names.get(row.created_by) ?? null,
      receipt_url: row.receipt_path
        ? (receipts.get(row.receipt_path) ?? null)
        : null,
    };
  });
}

export async function getProjectExpenseStats(
  projectId: string,
): Promise<
  | { stats: ExpenseStats; error: null }
  | { stats: null; error: "not_found" }
  | { stats: null; error: string }
> {
  const today = todayIsoDate();
  const monthStart = startOfMonthIso(today);

  const [allTime, month, todayStats] = await Promise.all([
    getProjectCostTotals(projectId),
    getProjectCostTotals(projectId, { from: monthStart, to: today }),
    getProjectCostTotals(projectId, { from: today, to: today }),
  ]);

  if (
    allTime.error === "not_found" ||
    month.error === "not_found" ||
    todayStats.error === "not_found"
  ) {
    return { stats: null, error: "not_found" };
  }

  if (allTime.error || !allTime.totals) {
    return { stats: null, error: allTime.error };
  }

  if (month.error || !month.totals) {
    return { stats: null, error: month.error };
  }

  if (todayStats.error || !todayStats.totals) {
    return { stats: null, error: todayStats.error };
  }

  return {
    stats: {
      total_amount: allTime.totals.other_expenses,
      this_month_amount: month.totals.other_expenses,
      today_amount: todayStats.totals.other_expenses,
      active_count: allTime.totals.expense_records,
    },
    error: null,
  };
}

export async function getProjectExpenses(
  projectId: string,
  filters: ExpenseFilters = {},
  pagination: Pagination = parsePagination({}),
): Promise<
  | { result: ExpenseListResult; error: null }
  | { result: null; error: "not_found" }
  | { result: null; error: string }
> {
  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      result: null,
      error:
        projectResult.error === "not_found" ? "not_found" : projectResult.error,
    };
  }

  const supabase = await createClient();
  let query = supabase
    .from("project_expenses")
    .select("*, vendors ( id, name )", { count: "exact" })
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id);

  if (filters.status !== "all") {
    query = query.eq("status", filters.status ?? "active");
  }

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  if (filters.vendorId) {
    query = query.eq("vendor_id", filters.vendorId);
  }

  if (filters.paymentMethod) {
    query = query.eq("payment_method", filters.paymentMethod);
  }

  if (filters.from) {
    query = query.gte("expense_date", filters.from);
  }

  if (filters.to) {
    query = query.lte("expense_date", filters.to);
  }

  if (filters.query) {
    const term = sanitizeSearchTerm(filters.query);
    if (term) {
      query = query.or(
        `description.ilike.%${term}%,reference_number.ilike.%${term}%,notes.ilike.%${term}%`,
      );
    }
  }

  const { data, error, count } = await query
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(pagination.from, pagination.to);

  if (error) {
    return { result: null, error: getExpenseErrorMessage(error) };
  }

  const statsResult = await getProjectExpenseStats(projectId);
  if (statsResult.error === "not_found") {
    return { result: null, error: "not_found" };
  }

  if (statsResult.error || !statsResult.stats) {
    return { result: null, error: statsResult.error };
  }

  const expenses = await mapExpenseRows((data ?? []) as ExpenseJoin[]);
  const total = count ?? 0;
  const meta = paginationMeta(pagination.page, pagination.pageSize, total);

  return {
    result: {
      expenses,
      stats: statsResult.stats,
      ...meta,
    },
    error: null,
  };
}

export const getExpenseById = cache(async function getExpenseById(
  projectId: string,
  expenseId: string,
): Promise<
  | { expense: ExpenseDetail; error: null }
  | { expense: null; error: "not_found" }
  | { expense: null; error: string }
> {
  if (!isUuid(projectId) || !isUuid(expenseId)) {
    return { expense: null, error: "not_found" };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      expense: null,
      error:
        projectResult.error === "not_found" ? "not_found" : projectResult.error,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_expenses")
    .select("*, vendors ( id, name )")
    .eq("id", expenseId)
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id)
    .maybeSingle();

  if (error) {
    return { expense: null, error: getExpenseErrorMessage(error) };
  }

  if (!data) {
    return { expense: null, error: "not_found" };
  }

  const [mapped] = await mapExpenseRows([data as ExpenseJoin]);
  return { expense: mapped, error: null };
});

export async function getVendorExpenses(
  vendorId: string,
  businessId: string,
  limit = 10,
): Promise<
  | {
      expenses: VendorExpenseListItem[];
      total_cost: string;
      count: number;
      error: null;
    }
  | { expenses: []; total_cost: "0.00"; count: 0; error: string }
> {
  if (!isUuid(vendorId)) {
    return { expenses: [], total_cost: "0.00", count: 0, error: "not_found" };
  }

  const supabase = await createClient();
  const [{ data, error }, totalsResult] = await Promise.all([
    supabase
      .from("project_expenses")
      .select(
        "id, project_id, category, description, amount, expense_date, status, projects ( id, name )",
      )
      .eq("vendor_id", vendorId)
      .eq("business_id", businessId)
      .eq("status", "active")
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit),
    // PostgREST aggregates (amount.sum) are disabled on this project (PGRST123).
    supabase
      .from("project_expenses")
      .select("amount")
      .eq("vendor_id", vendorId)
      .eq("business_id", businessId)
      .eq("status", "active"),
  ]);

  if (error) {
    return {
      expenses: [],
      total_cost: "0.00",
      count: 0,
      error: getExpenseErrorMessage(error),
    };
  }

  if (totalsResult.error) {
    return {
      expenses: [],
      total_cost: "0.00",
      count: 0,
      error: getExpenseErrorMessage(totalsResult.error),
    };
  }

  type Row = {
    id: string;
    project_id: string;
    category: VendorExpenseListItem["category"];
    description: string;
    amount: string;
    expense_date: string;
    status: VendorExpenseListItem["status"];
    projects: { id: string; name: string } | { id: string; name: string }[] | null;
  };

  const expenses = ((data ?? []) as Row[]).map((row) => {
    const projectJoin = row.projects;
    const project = Array.isArray(projectJoin) ? projectJoin[0] : projectJoin;

    return {
      id: row.id,
      project_id: row.project_id,
      project_name: project?.name ?? "Project",
      category: row.category,
      description: row.description,
      amount: row.amount,
      expense_date: row.expense_date,
      status: row.status,
    };
  });

  const amountRows = (totalsResult.data ?? []) as Array<{ amount: string | number }>;
  const totalPaise = amountRows.reduce(
    (sum, row) => sum + moneyToPaise(row.amount),
    0,
  );

  return {
    expenses,
    total_cost: formatPaise(totalPaise),
    count: amountRows.length,
    error: null,
  };
}

export { EXPENSE_CATEGORY_LABELS };
