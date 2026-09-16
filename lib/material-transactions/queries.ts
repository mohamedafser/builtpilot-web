import { isMaterialTransactionType } from "@/constants/material";
import {
  paginationMeta,
  parsePagination,
  type Pagination,
  type PaginationMeta,
} from "@/lib/api/pagination";
import { getMaterialErrorMessage, isUuid } from "@/lib/materials/helpers";
import { parseQuantityToMilli } from "@/lib/materials/stock";
import type {
  MaterialTransactionFilters,
  MaterialTransactionListItem,
} from "@/lib/materials/types";
import { getProjectById, getWorkspaceScope } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import type { MaterialTransaction, MaterialUnit } from "@/types";

type NamedJoin =
  { id: string; name: string } | { id: string; name: string }[] | null;
type MaterialJoin =
  | { id: string; name: string; unit: MaterialUnit }
  | { id: string; name: string; unit: MaterialUnit }[]
  | null;

export type TransactionJoin = MaterialTransaction & {
  materials: MaterialJoin;
  projects: NamedJoin;
  vendors: NamedJoin;
};

function firstNamed(value: NamedJoin): { id: string; name: string } | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function firstMaterial(
  value: MaterialJoin,
): { id: string; name: string; unit: MaterialUnit } | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function mapTransactionRows(
  rows: TransactionJoin[],
): MaterialTransactionListItem[] {
  return rows.flatMap((row) => {
    const material = firstMaterial(row.materials);
    const project = firstNamed(row.projects);
    const vendor = firstNamed(row.vendors);

    if (!material || !project) {
      return [];
    }

    const {
      materials: _materials,
      projects: _projects,
      vendors: _vendors,
      ...transaction
    } = row;
    void _materials;
    void _projects;
    void _vendors;

    return [
      {
        ...transaction,
        material_name: material.name,
        material_unit: material.unit,
        project_name: project.name,
        vendor_name: vendor?.name ?? null,
      },
    ];
  });
}

export const TRANSACTION_SELECT = `
  *,
  materials ( id, name, unit ),
  projects ( id, name ),
  vendors ( id, name )
`;

export function parseTransactionSearchParams(searchParams: {
  from?: string;
  to?: string;
  material?: string;
  vendor?: string;
  type?: string;
}): MaterialTransactionFilters {
  const material = searchParams.material?.trim();
  const vendor = searchParams.vendor?.trim();
  const type = searchParams.type;

  return {
    from: searchParams.from?.trim() || undefined,
    to: searchParams.to?.trim() || undefined,
    materialId: material && isUuid(material) ? material : undefined,
    vendorId: vendor && isUuid(vendor) ? vendor : undefined,
    type: type && isMaterialTransactionType(type) ? type : undefined,
  };
}

export async function getMaterialTransactions(
  filters: MaterialTransactionFilters = {},
  pagination: Pagination = parsePagination({}),
  projectId?: string,
): Promise<
  {
    transactions: MaterialTransactionListItem[];
    error: string | null;
  } & PaginationMeta
> {
  const empty = {
    transactions: [] as MaterialTransactionListItem[],
    ...paginationMeta(pagination.page, pagination.pageSize, 0),
    error: null as string | null,
  };

  if (projectId) {
    if (!isUuid(projectId)) {
      return { ...empty, error: "not_found" };
    }

    const projectResult = await getProjectById(projectId);

    if (projectResult.error === "not_found" || !projectResult.project) {
      return {
        ...empty,
        error:
          projectResult.error === "not_found"
            ? "not_found"
            : projectResult.error,
      };
    }
  }

  const scope = await getWorkspaceScope();

  if (!scope.ok) {
    return { ...empty, error: scope.message };
  }

  const supabase = await createClient();
  let query = supabase
    .from("material_transactions")
    .select(TRANSACTION_SELECT, { count: "exact" })
    .eq("business_id", scope.business.id);

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  if (filters.materialId) {
    query = query.eq("material_id", filters.materialId);
  }

  if (filters.vendorId) {
    query = query.eq("vendor_id", filters.vendorId);
  }

  if (filters.type) {
    query = query.eq("transaction_type", filters.type);
  }

  if (filters.from) {
    query = query.gte("transaction_date", filters.from);
  }

  if (filters.to) {
    query = query.lte("transaction_date", filters.to);
  }

  const { data, error, count } = await query
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(pagination.from, pagination.to);

  if (error) {
    return { ...empty, error: getMaterialErrorMessage(error) };
  }

  return {
    transactions: mapTransactionRows((data ?? []) as TransactionJoin[]),
    error: null,
    ...paginationMeta(pagination.page, pagination.pageSize, count ?? 0),
  };
}

export async function getProjectMaterialStock(
  projectId: string,
  materialId: string,
): Promise<
  | { stockMilli: number; error: null }
  | { stockMilli: 0; error: "not_found" }
  | { stockMilli: 0; error: string }
> {
  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      stockMilli: 0,
      error:
        projectResult.error === "not_found" ? "not_found" : projectResult.error,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("material_stock_balances")
    .select("current_stock")
    .eq("business_id", projectResult.project.business_id)
    .eq("project_id", projectId)
    .eq("material_id", materialId)
    .maybeSingle();

  if (error) {
    return { stockMilli: 0, error: getMaterialErrorMessage(error) };
  }

  return {
    stockMilli: parseQuantityToMilli(data?.current_stock ?? "0") ?? 0,
    error: null,
  };
}
