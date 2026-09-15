import { cache } from "react";
import { isMaterialCategory, isMaterialStatus } from "@/constants/material";
import {
  paginationMeta,
  parsePagination,
  type Pagination,
  type PaginationMeta,
} from "@/lib/api/pagination";
import {
  getMaterialErrorMessage,
  isUuid,
  sanitizeSearchTerm,
} from "@/lib/materials/helpers";
import {
  averageUnitPricePaise,
  formatMilli,
  formatPaise,
  parseMoneyToPaise,
  parseQuantityToMilli,
  resolveStockStatus,
  stockValuePaise,
} from "@/lib/materials/stock";
import type {
  MaterialCostSummary,
  MaterialDetail,
  MaterialFilters,
  MaterialListItem,
  MaterialProjectUsage,
  StockSummary,
} from "@/lib/materials/types";
import { mapTransactionRows } from "@/lib/material-transactions/queries";
import { getWorkspaceScope } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import type { Material, MaterialStockBalance, Project } from "@/types";

type NamedJoin =
  { id: string; name: string } | { id: string; name: string }[] | null;

function nameFromJoin(value: NamedJoin): string | null {
  if (!value) {
    return null;
  }

  const row = Array.isArray(value) ? value[0] : value;
  return row?.name ?? null;
}

function milliFromNumeric(value: string | number | null | undefined): number {
  if (value == null || value === "") {
    return 0;
  }

  return parseQuantityToMilli(value) ?? 0;
}

function paiseFromNumeric(value: string | number | null | undefined): number {
  if (value == null || value === "") {
    return 0;
  }

  return parseMoneyToPaise(value) ?? 0;
}

function summarizeBalances(
  rows: MaterialStockBalance[],
  minimumStock: string | null,
): StockSummary & MaterialCostSummary {
  let current = 0;
  let received = 0;
  let used = 0;
  let returned = 0;
  let purchasedPaise = 0;

  for (const row of rows) {
    current += milliFromNumeric(row.current_stock);
    received += milliFromNumeric(row.total_received);
    used += milliFromNumeric(row.total_used);
    returned += milliFromNumeric(row.total_returned);
    purchasedPaise += paiseFromNumeric(row.total_purchased_cost);
  }

  const average = averageUnitPricePaise(purchasedPaise, received);
  const minimum = minimumStock ? parseQuantityToMilli(minimumStock) : null;

  return {
    current_stock: formatMilli(current),
    total_received: formatMilli(received),
    total_used: formatMilli(used),
    total_returned: formatMilli(returned),
    stock_status: resolveStockStatus(current, minimum),
    total_purchased_cost: formatPaise(purchasedPaise),
    total_used_cost: formatPaise(stockValuePaise(used, average ?? 0)),
    average_purchase_price: average === null ? null : formatPaise(average),
    stock_value: formatPaise(stockValuePaise(current, average ?? 0)),
  };
}

export function parseMaterialSearchParams(searchParams: {
  q?: string;
  status?: string;
  category?: string;
}): MaterialFilters {
  const status = searchParams.status;
  const category = searchParams.category;

  return {
    query: searchParams.q?.trim() || undefined,
    status: status && isMaterialStatus(status) ? status : undefined,
    category: category && isMaterialCategory(category) ? category : undefined,
  };
}

export async function getMaterials(
  filters: MaterialFilters = {},
  pagination: Pagination = parsePagination({}),
): Promise<
  {
    materials: MaterialListItem[];
    error: string | null;
  } & PaginationMeta
> {
  const empty = {
    materials: [] as MaterialListItem[],
    ...paginationMeta(pagination.page, pagination.pageSize, 0),
    error: null as string | null,
  };

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { ...empty, error: scope.message };
  }

  const supabase = await createClient();
  let query = supabase
    .from("materials")
    .select("*, vendors ( id, name )", { count: "exact" })
    .eq("business_id", scope.business.id);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  const search = filters.query ? sanitizeSearchTerm(filters.query) : "";

  if (search) {
    const categoryMatch = isMaterialCategory(search.toLowerCase())
      ? search.toLowerCase()
      : null;

    if (categoryMatch && !filters.category) {
      query = query.or(`name.ilike.%${search}%,category.eq.${categoryMatch}`);
    } else {
      query = query.ilike("name", `%${search}%`);
    }
  }

  const { data, error, count } = await query
    .order("name", { ascending: true })
    .range(pagination.from, pagination.to);

  if (error) {
    return { ...empty, error: getMaterialErrorMessage(error) };
  }

  const materials = ((data ?? []) as (Material & { vendors: NamedJoin })[]).map(
    (row) => {
      const { vendors, ...material } = row;
      return {
        ...material,
        vendor_name: nameFromJoin(vendors),
      };
    },
  );
  const materialIds = materials.map((row) => row.id);
  const balancesByMaterial = new Map<string, MaterialStockBalance[]>();

  if (materialIds.length > 0) {
    const { data: balances, error: balanceError } = await supabase
      .from("material_stock_balances")
      .select("*")
      .eq("business_id", scope.business.id)
      .in("material_id", materialIds);

    if (balanceError) {
      return { ...empty, error: getMaterialErrorMessage(balanceError) };
    }

    for (const row of balances ?? []) {
      if (!row.material_id) {
        continue;
      }

      const current = balancesByMaterial.get(row.material_id) ?? [];
      current.push(row);
      balancesByMaterial.set(row.material_id, current);
    }
  }

  return {
    materials: materials.map((material) => {
      const summary = summarizeBalances(
        balancesByMaterial.get(material.id) ?? [],
        material.minimum_stock,
      );

      return {
        ...material,
        current_stock: summary.current_stock,
        stock_status: summary.stock_status,
        vendor_name: material.vendor_name,
      };
    }),
    error: null,
    ...paginationMeta(pagination.page, pagination.pageSize, count ?? 0),
  };
}

export const getMaterialById = cache(async function getMaterialById(
  id: string,
): Promise<
  | { material: MaterialDetail; error: null }
  | { material: null; error: "not_found" }
  | { material: null; error: string }
> {
  if (!isUuid(id)) {
    return { material: null, error: "not_found" };
  }

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { material: null, error: scope.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials")
    .select("*, vendors ( id, name )")
    .eq("id", id)
    .eq("business_id", scope.business.id)
    .maybeSingle();

  if (error) {
    return { material: null, error: getMaterialErrorMessage(error) };
  }

  if (!data) {
    return { material: null, error: "not_found" };
  }

  const { vendors, ...material } = data as Material & { vendors: NamedJoin };
  const vendorName = nameFromJoin(vendors);

  const { data: balances, error: balanceError } = await supabase
    .from("material_stock_balances")
    .select("*")
    .eq("business_id", scope.business.id)
    .eq("material_id", id);

  if (balanceError) {
    return { material: null, error: getMaterialErrorMessage(balanceError) };
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from("project_materials")
    .select("project_id, projects ( id, name )")
    .eq("business_id", scope.business.id)
    .eq("material_id", id);

  if (assignmentError) {
    return { material: null, error: getMaterialErrorMessage(assignmentError) };
  }

  const summary = summarizeBalances(balances ?? [], material.minimum_stock);
  const balanceByProject = new Map(
    (balances ?? [])
      .filter((row) => Boolean(row.project_id))
      .map((row) => [row.project_id as string, row]),
  );

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

  const projectUsage: MaterialProjectUsage[] = [];
  const seenProjects = new Set<string>();

  for (const row of assignments ?? []) {
    const project = projectFromJoin(row.projects as ProjectJoin);
    const projectId = project?.id ?? row.project_id;

    if (!projectId || seenProjects.has(projectId)) {
      continue;
    }

    seenProjects.add(projectId);
    const balance = balanceByProject.get(projectId);

    projectUsage.push({
      project_id: projectId,
      project_name: project?.name ?? "Project",
      current_stock: formatMilli(milliFromNumeric(balance?.current_stock)),
      total_used: formatMilli(milliFromNumeric(balance?.total_used)),
      total_purchased_cost: formatPaise(
        paiseFromNumeric(balance?.total_purchased_cost),
      ),
    });
  }

  for (const [projectId, balance] of balanceByProject) {
    if (seenProjects.has(projectId)) {
      continue;
    }

    projectUsage.push({
      project_id: projectId,
      project_name: "Project",
      current_stock: formatMilli(milliFromNumeric(balance.current_stock)),
      total_used: formatMilli(milliFromNumeric(balance.total_used)),
      total_purchased_cost: formatPaise(
        paiseFromNumeric(balance.total_purchased_cost),
      ),
    });
  }

  projectUsage.sort((a, b) => a.project_name.localeCompare(b.project_name));

  const { data: transactions, error: transactionError } = await supabase
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
    .eq("material_id", id)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  if (transactionError) {
    return { material: null, error: getMaterialErrorMessage(transactionError) };
  }

  return {
    material: {
      ...material,
      vendor_name: vendorName,
      inventory: {
        current_stock: summary.current_stock,
        total_received: summary.total_received,
        total_used: summary.total_used,
        total_returned: summary.total_returned,
        stock_status: summary.stock_status,
      },
      cost: {
        total_purchased_cost: summary.total_purchased_cost,
        total_used_cost: summary.total_used_cost,
        average_purchase_price: summary.average_purchase_price,
        stock_value: summary.stock_value,
      },
      project_usage: projectUsage,
      recent_transactions: mapTransactionRows(transactions ?? []),
    },
    error: null,
  };
});

export async function getActiveMaterials(): Promise<{
  materials: Material[];
  error: string | null;
}> {
  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { materials: [], error: scope.message };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .eq("business_id", scope.business.id)
    .eq("status", "active")
    .order("name", { ascending: true })
    .limit(500);

  if (error) {
    return { materials: [], error: getMaterialErrorMessage(error) };
  }

  return { materials: data ?? [], error: null };
}

export async function getAvailableProjectsForMaterial(
  materialId: string,
): Promise<
  | { projects: Project[]; error: null }
  | { projects: []; error: "not_found" }
  | { projects: []; error: string }
> {
  const materialResult = await getMaterialById(materialId);

  if (materialResult.error === "not_found" || !materialResult.material) {
    return {
      projects: [],
      error:
        materialResult.error === "not_found"
          ? "not_found"
          : materialResult.error,
    };
  }

  const assignedIds = new Set(
    materialResult.material.project_usage.map((row) => row.project_id),
  );

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("business_id", materialResult.material.business_id)
    .is("archived_at", null)
    .order("name", { ascending: true })
    .limit(500);

  if (error) {
    return { projects: [], error: getMaterialErrorMessage(error) };
  }

  return {
    projects: (data ?? []).filter((project) => !assignedIds.has(project.id)),
    error: null,
  };
}
