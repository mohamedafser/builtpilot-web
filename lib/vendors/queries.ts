import { cache } from "react";
import { isVendorStatus } from "@/constants/vendor";
import {
  paginationMeta,
  parsePagination,
  type Pagination,
  type PaginationMeta,
} from "@/lib/api/pagination";
import { getVendorExpenses } from "@/lib/expenses/queries";
import { mapTransactionRows } from "@/lib/material-transactions/queries";
import { formatPaise, parseMoneyToPaise } from "@/lib/materials/stock";
import { getWorkspaceScope } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import type { Project, Vendor } from "@/types";
import {
  getVendorErrorMessage,
  isUuid,
  sanitizeSearchTerm,
} from "@/lib/vendors/helpers";
import type {
  VendorDetail,
  VendorFilters,
  VendorListItem,
  VendorProjectSupplied,
} from "@/lib/vendors/types";

export function parseVendorSearchParams(searchParams: {
  q?: string;
  status?: string;
}): VendorFilters {
  const status = searchParams.status;

  return {
    query: searchParams.q?.trim() || undefined,
    status: status && isVendorStatus(status) ? status : undefined,
  };
}

async function purchaseTotalsByVendor(
  businessId: string,
  vendorIds: string[],
): Promise<
  | { totals: Map<string, { count: number; paise: number }>; error: null }
  | { totals: Map<string, { count: number; paise: number }>; error: string }
> {
  const totals = new Map<string, { count: number; paise: number }>();

  if (vendorIds.length === 0) {
    return { totals, error: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("material_transactions")
    .select("vendor_id, total_cost")
    .eq("business_id", businessId)
    .eq("transaction_type", "received")
    .in("vendor_id", vendorIds);

  if (error) {
    return { totals, error: getVendorErrorMessage(error) };
  }

  for (const row of data ?? []) {
    if (!row.vendor_id) {
      continue;
    }

    const current = totals.get(row.vendor_id) ?? { count: 0, paise: 0 };
    current.count += 1;
    current.paise += parseMoneyToPaise(row.total_cost ?? "0") ?? 0;
    totals.set(row.vendor_id, current);
  }

  return { totals, error: null };
}

export async function getVendors(
  filters: VendorFilters = {},
  pagination: Pagination = parsePagination({}),
): Promise<
  {
    vendors: VendorListItem[];
    error: string | null;
  } & PaginationMeta
> {
  const empty = {
    vendors: [] as VendorListItem[],
    ...paginationMeta(pagination.page, pagination.pageSize, 0),
    error: null as string | null,
  };

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { ...empty, error: scope.message };
  }

  const supabase = await createClient();
  let query = supabase
    .from("vendors")
    .select("*", { count: "exact" })
    .eq("business_id", scope.business.id);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const search = filters.query ? sanitizeSearchTerm(filters.query) : "";

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,contact_person.ilike.%${search}%,phone.ilike.%${search}%`,
    );
  }

  const { data, error, count } = await query
    .order("name", { ascending: true })
    .range(pagination.from, pagination.to);

  if (error) {
    return { ...empty, error: getVendorErrorMessage(error) };
  }

  const vendors = (data ?? []) as Vendor[];
  const totalsResult = await purchaseTotalsByVendor(
    scope.business.id,
    vendors.map((vendor) => vendor.id),
  );

  if (totalsResult.error) {
    return { ...empty, error: totalsResult.error };
  }

  return {
    vendors: vendors.map((vendor) => {
      const totals = totalsResult.totals.get(vendor.id) ?? {
        count: 0,
        paise: 0,
      };

      return {
        ...vendor,
        purchase_count: totals.count,
        total_purchase_cost: formatPaise(totals.paise),
      };
    }),
    error: null,
    ...paginationMeta(pagination.page, pagination.pageSize, count ?? 0),
  };
}

export const getVendorById = cache(async function getVendorById(
  id: string,
): Promise<
  | { vendor: VendorDetail; error: null }
  | { vendor: null; error: "not_found" }
  | { vendor: null; error: string }
> {
  if (!isUuid(id)) {
    return { vendor: null, error: "not_found" };
  }

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { vendor: null, error: scope.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("id", id)
    .eq("business_id", scope.business.id)
    .maybeSingle();

  if (error) {
    return { vendor: null, error: getVendorErrorMessage(error) };
  }

  if (!data) {
    return { vendor: null, error: "not_found" };
  }

  const { data: purchases, error: purchaseError } = await supabase
    .from("material_transactions")
    .select(
      `
        *,
        materials ( id, name, unit ),
        projects ( id, name ),
        vendors ( id, name )
      `,
    )
    .eq("business_id", scope.business.id)
    .eq("vendor_id", id)
    .eq("transaction_type", "received")
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (purchaseError) {
    return { vendor: null, error: getVendorErrorMessage(purchaseError) };
  }

  const recent = mapTransactionRows(purchases ?? []);

  const { data: allCosts, error: costError } = await supabase
    .from("material_transactions")
    .select("total_cost, project_id")
    .eq("business_id", scope.business.id)
    .eq("vendor_id", id)
    .eq("transaction_type", "received");

  if (costError) {
    return { vendor: null, error: getVendorErrorMessage(costError) };
  }

  let fullPaise = 0;
  const projectIds = new Set<string>();
  const projectTotals = new Map<string, { count: number; paise: number }>();

  for (const row of allCosts ?? []) {
    fullPaise += parseMoneyToPaise(row.total_cost ?? "0") ?? 0;
    if (!row.project_id) {
      continue;
    }
    projectIds.add(row.project_id);
    const current = projectTotals.get(row.project_id) ?? { count: 0, paise: 0 };
    current.count += 1;
    current.paise += parseMoneyToPaise(row.total_cost ?? "0") ?? 0;
    projectTotals.set(row.project_id, current);
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from("project_vendors")
    .select("project_id, projects ( id, name )")
    .eq("business_id", scope.business.id)
    .eq("vendor_id", id);

  if (assignmentError) {
    return { vendor: null, error: getVendorErrorMessage(assignmentError) };
  }

  type ProjectJoin =
    { id: string; name: string } | { id: string; name: string }[] | null;

  function projectFromJoin(
    value: ProjectJoin,
  ): { id: string; name: string } | null {
    if (!value) {
      return null;
    }

    return Array.isArray(value) ? (value[0] ?? null) : value;
  }

  const names = new Map(
    recent.map((row) => [row.project_id, row.project_name]),
  );

  for (const row of assignments ?? []) {
    const project = projectFromJoin(row.projects as ProjectJoin);
    const projectId = project?.id ?? row.project_id;

    if (projectId) {
      projectIds.add(projectId);
    }

    if (project) {
      names.set(project.id, project.name);
    }
  }

  if (projectIds.size > 0) {
    const missing = [...projectIds].filter(
      (projectId) => !names.has(projectId),
    );
    if (missing.length > 0) {
      const { data: projectRows, error: projectError } = await supabase
        .from("projects")
        .select("id, name")
        .eq("business_id", scope.business.id)
        .in("id", missing);

      if (projectError) {
        return { vendor: null, error: getVendorErrorMessage(projectError) };
      }

      for (const project of projectRows ?? []) {
        names.set(project.id, project.name);
      }
    }
  }

  const projectsSupplied: VendorProjectSupplied[] = [...projectIds]
    .map((projectId) => {
      const totals = projectTotals.get(projectId) ?? { count: 0, paise: 0 };

      return {
        project_id: projectId,
        project_name: names.get(projectId) ?? "Project",
        purchase_count: totals.count,
        total_cost: formatPaise(totals.paise),
      };
    })
    .sort((a, b) => a.project_name.localeCompare(b.project_name));

  const vendorExpenses = await getVendorExpenses(id, scope.business.id, 8);

  if (vendorExpenses.error) {
    return { vendor: null, error: vendorExpenses.error };
  }

  return {
    vendor: {
      ...data,
      purchase_count: allCosts?.length ?? 0,
      total_purchase_cost: formatPaise(fullPaise),
      projects_supplied: projectsSupplied,
      recent_purchases: recent,
      expense_count: vendorExpenses.count,
      total_expense_cost: vendorExpenses.total_cost,
      recent_expenses: vendorExpenses.expenses,
    },
    error: null,
  };
});

export async function getActiveVendors(): Promise<{
  vendors: Vendor[];
  error: string | null;
}> {
  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { vendors: [], error: scope.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("business_id", scope.business.id)
    .eq("status", "active")
    .order("name", { ascending: true })
    .limit(500);

  if (error) {
    return { vendors: [], error: getVendorErrorMessage(error) };
  }

  return { vendors: data ?? [], error: null };
}

export async function getAvailableProjectsForVendor(
  vendorId: string,
): Promise<
  | { projects: Project[]; error: null }
  | { projects: []; error: "not_found" }
  | { projects: []; error: string }
> {
  const vendorResult = await getVendorById(vendorId);

  if (vendorResult.error === "not_found" || !vendorResult.vendor) {
    return {
      projects: [],
      error:
        vendorResult.error === "not_found" ? "not_found" : vendorResult.error,
    };
  }

  const assignedIds = new Set(
    vendorResult.vendor.projects_supplied.map((row) => row.project_id),
  );

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("business_id", vendorResult.vendor.business_id)
    .is("archived_at", null)
    .order("name", { ascending: true })
    .limit(500);

  if (error) {
    return { projects: [], error: getVendorErrorMessage(error) };
  }

  return {
    projects: (data ?? []).filter((project) => !assignedIds.has(project.id)),
    error: null,
  };
}
