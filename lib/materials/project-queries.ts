import { startOfMonthIso, todayIsoDate } from "@/lib/labour/money";
import { readMaterialsAdjustmentsSeenAt } from "@/lib/materials/adjustments-seen-server";
import { getMaterialErrorMessage, isUuid } from "@/lib/materials/helpers";
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
  NamedCostTotal,
  ProjectMaterialCostSummary,
  ProjectMaterialRow,
  ProjectMaterialsDashboard,
} from "@/lib/materials/types";
import {
  mapTransactionRows,
  TRANSACTION_SELECT,
} from "@/lib/material-transactions/queries";
import { getProjectById } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import type { Material, MaterialStockBalance } from "@/types";

type ProjectMaterialJoin = {
  id: string;
  project_id: string;
  material_id: string;
  planned_quantity: string | null;
  minimum_stock: string | null;
  materials: Material | Material[] | null;
};

function materialFromJoin(
  value: ProjectMaterialJoin["materials"],
): Material | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function milli(value: string | number | null | undefined): number {
  if (value == null || value === "") {
    return 0;
  }

  return parseQuantityToMilli(value) ?? 0;
}

function paise(value: string | number | null | undefined): number {
  if (value == null || value === "") {
    return 0;
  }

  return parseMoneyToPaise(value) ?? 0;
}

function topTotals(
  map: Map<string, { name: string; quantityMilli: number; costPaise: number }>,
  sort: "quantity" | "cost",
  limit = 5,
): NamedCostTotal[] {
  return [...map.entries()]
    .map(([id, value]) => ({
      id,
      name: value.name,
      quantity: formatMilli(value.quantityMilli),
      total_cost: formatPaise(value.costPaise),
      quantityMilli: value.quantityMilli,
      costPaise: value.costPaise,
    }))
    .sort((a, b) =>
      sort === "quantity"
        ? b.quantityMilli - a.quantityMilli
        : b.costPaise - a.costPaise,
    )
    .slice(0, limit)
    .map(({ id, name, quantity, total_cost }) => ({
      id,
      name,
      quantity,
      total_cost,
    }));
}

export async function getAvailableMaterialsForProject(
  projectId: string,
): Promise<
  | { materials: Material[]; error: null }
  | { materials: []; error: "not_found" }
  | { materials: []; error: string }
> {
  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      materials: [],
      error:
        projectResult.error === "not_found" ? "not_found" : projectResult.error,
    };
  }

  const supabase = await createClient();
  const [{ data: assigned, error: assignedError }, { data: materials, error }] =
    await Promise.all([
      supabase
        .from("project_materials")
        .select("material_id")
        .eq("project_id", projectId)
        .eq("business_id", projectResult.project.business_id),
      supabase
        .from("materials")
        .select("*")
        .eq("business_id", projectResult.project.business_id)
        .eq("status", "active")
        .order("name", { ascending: true })
        .limit(500),
    ]);

  if (assignedError) {
    return { materials: [], error: getMaterialErrorMessage(assignedError) };
  }

  if (error) {
    return { materials: [], error: getMaterialErrorMessage(error) };
  }

  const assignedIds = new Set((assigned ?? []).map((row) => row.material_id));

  return {
    materials: (materials ?? []).filter(
      (material) => !assignedIds.has(material.id),
    ),
    error: null,
  };
}

export async function getProjectMaterialCostSummary(
  projectId: string,
  range: { from?: string; to?: string } = {},
): Promise<
  | { summary: ProjectMaterialCostSummary; error: null }
  | { summary: null; error: "not_found" }
  | { summary: null; error: string }
> {
  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      summary: null,
      error:
        projectResult.error === "not_found" ? "not_found" : projectResult.error,
    };
  }

  const from = range.from ?? startOfMonthIso(todayIsoDate());
  const to = range.to ?? todayIsoDate();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("material_transactions")
    .select(
      `
        material_id,
        vendor_id,
        quantity,
        total_cost,
        transaction_type,
        materials ( id, name ),
        vendors ( id, name )
      `,
    )
    .eq("business_id", projectResult.project.business_id)
    .eq("project_id", projectId)
    .in("transaction_type", ["received", "used"])
    .gte("transaction_date", from)
    .lte("transaction_date", to);

  if (error) {
    return { summary: null, error: getMaterialErrorMessage(error) };
  }

  const { data: balances, error: balanceError } = await supabase
    .from("material_stock_balances")
    .select("*")
    .eq("business_id", projectResult.project.business_id)
    .eq("project_id", projectId);

  if (balanceError) {
    return { summary: null, error: getMaterialErrorMessage(balanceError) };
  }

  const materialTotals = new Map<
    string,
    { name: string; quantityMilli: number; costPaise: number }
  >();
  const vendorTotals = new Map<
    string,
    { name: string; quantityMilli: number; costPaise: number }
  >();
  let purchaseCount = 0;
  let costPaise = 0;
  let usedCostPaise = 0;

  for (const row of data ?? []) {
    const linePaise = paise(row.total_cost);
    const lineMilli = milli(row.quantity);

    if (row.transaction_type === "used") {
      usedCostPaise += linePaise;
      continue;
    }

    purchaseCount += 1;
    costPaise += linePaise;

    const materialJoin = row.materials as
      { id: string; name: string } | { id: string; name: string }[] | null;
    const material = Array.isArray(materialJoin)
      ? materialJoin[0]
      : materialJoin;
    const materialKey = row.material_id;
    const materialName = material?.name ?? "Material";
    const materialCurrent = materialTotals.get(materialKey) ?? {
      name: materialName,
      quantityMilli: 0,
      costPaise: 0,
    };
    materialCurrent.quantityMilli += lineMilli;
    materialCurrent.costPaise += linePaise;
    materialTotals.set(materialKey, materialCurrent);

    if (row.vendor_id) {
      const vendorJoin = row.vendors as
        { id: string; name: string } | { id: string; name: string }[] | null;
      const vendor = Array.isArray(vendorJoin) ? vendorJoin[0] : vendorJoin;
      const vendorCurrent = vendorTotals.get(row.vendor_id) ?? {
        name: vendor?.name ?? "Vendor",
        quantityMilli: 0,
        costPaise: 0,
      };
      vendorCurrent.quantityMilli += lineMilli;
      vendorCurrent.costPaise += linePaise;
      vendorTotals.set(row.vendor_id, vendorCurrent);
    }
  }

  let stockValue = 0;
  for (const row of (balances ?? []) as MaterialStockBalance[]) {
    const receivedMilli = milli(row.total_received);
    const purchased = paise(row.total_purchased_cost);
    const average = averageUnitPricePaise(purchased, receivedMilli);
    stockValue += stockValuePaise(milli(row.current_stock), average ?? 0);
  }

  return {
    summary: {
      from,
      to,
      total_purchases: purchaseCount,
      total_material_cost: formatPaise(costPaise),
      total_used_cost: formatPaise(usedCostPaise),
      material_types: (balances ?? []).length,
      stock_value: formatPaise(stockValue),
      most_purchased: topTotals(materialTotals, "quantity"),
      highest_cost: topTotals(materialTotals, "cost"),
      vendor_totals: topTotals(vendorTotals, "cost"),
    },
    error: null,
  };
}

export async function getProjectMaterialsDashboard(
  projectId: string,
  range: { from?: string; to?: string } = {},
): Promise<
  | { dashboard: ProjectMaterialsDashboard; error: null }
  | { dashboard: null; error: "not_found" }
  | { dashboard: null; error: string }
> {
  if (!isUuid(projectId)) {
    return { dashboard: null, error: "not_found" };
  }

  const projectResult = await getProjectById(projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      dashboard: null,
      error:
        projectResult.error === "not_found" ? "not_found" : projectResult.error,
    };
  }

  const supabase = await createClient();
  const { data: assignedRows, error: assignedError } = await supabase
    .from("project_materials")
    .select(
      `
        id,
        project_id,
        material_id,
        planned_quantity,
        minimum_stock,
        materials (*)
      `,
    )
    .eq("project_id", projectId)
    .eq("business_id", projectResult.project.business_id)
    .order("created_at", { ascending: true });

  if (assignedError) {
    return { dashboard: null, error: getMaterialErrorMessage(assignedError) };
  }

  const { data: balances, error: balanceError } = await supabase
    .from("material_stock_balances")
    .select("*")
    .eq("business_id", projectResult.project.business_id)
    .eq("project_id", projectId);

  if (balanceError) {
    return { dashboard: null, error: getMaterialErrorMessage(balanceError) };
  }

  const balanceByMaterial = new Map<string, MaterialStockBalance>();
  for (const row of balances ?? []) {
    if (row.material_id) {
      balanceByMaterial.set(row.material_id, row);
    }
  }

  const { data: received, error: receivedError } = await supabase
    .from("material_transactions")
    .select(
      `
        material_id,
        vendor_id,
        unit_price,
        transaction_date,
        created_at,
        vendors ( id, name )
      `,
    )
    .eq("business_id", projectResult.project.business_id)
    .eq("project_id", projectId)
    .eq("transaction_type", "received")
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (receivedError) {
    return { dashboard: null, error: getMaterialErrorMessage(receivedError) };
  }

  const latestPrice = new Map<string, string>();
  const vendorNames = new Map<string, string[]>();
  type VendorJoin =
    { id: string; name: string } | { id: string; name: string }[] | null;

  for (const row of received ?? []) {
    if (!latestPrice.has(row.material_id) && row.unit_price) {
      latestPrice.set(row.material_id, row.unit_price);
    }

    const vendorJoin = row.vendors as VendorJoin;
    const vendor = Array.isArray(vendorJoin) ? vendorJoin[0] : vendorJoin;
    const vendorName = vendor?.name?.trim();

    if (!vendorName) {
      continue;
    }

    const current = vendorNames.get(row.material_id) ?? [];
    if (!current.includes(vendorName)) {
      current.push(vendorName);
      vendorNames.set(row.material_id, current);
    }
  }

  const adjustmentsSeenAt = await readMaterialsAdjustmentsSeenAt();
  let adjustmentsQuery = supabase
    .from("material_transactions")
    .select(
      `
        material_id,
        quantity,
        adjustment_direction,
        transaction_date,
        created_at
      `,
    )
    .eq("business_id", projectResult.project.business_id)
    .eq("project_id", projectId)
    .eq("transaction_type", "adjusted")
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (adjustmentsSeenAt) {
    adjustmentsQuery = adjustmentsQuery.gt("created_at", adjustmentsSeenAt);
  }

  const { data: adjustments, error: adjustmentsError } = await adjustmentsQuery;

  if (adjustmentsError) {
    return { dashboard: null, error: getMaterialErrorMessage(adjustmentsError) };
  }

  const lastAdjustmentByMaterial = new Map<
    string,
    {
      direction: "increase" | "decrease";
      quantity: string;
      date: string;
    }
  >();
  const adjustedIncreaseByMaterial = new Map<string, number>();
  const adjustedDecreaseByMaterial = new Map<string, number>();

  for (const row of adjustments ?? []) {
    const direction = row.adjustment_direction;
    if (direction !== "increase" && direction !== "decrease") {
      continue;
    }

    const qtyMilli = milli(row.quantity);
    if (direction === "increase") {
      adjustedIncreaseByMaterial.set(
        row.material_id,
        (adjustedIncreaseByMaterial.get(row.material_id) ?? 0) + qtyMilli,
      );
    } else {
      adjustedDecreaseByMaterial.set(
        row.material_id,
        (adjustedDecreaseByMaterial.get(row.material_id) ?? 0) + qtyMilli,
      );
    }

    if (!lastAdjustmentByMaterial.has(row.material_id)) {
      lastAdjustmentByMaterial.set(row.material_id, {
        direction,
        quantity: formatMilli(qtyMilli),
        date: row.transaction_date,
      });
    }
  }

  const assigned: ProjectMaterialRow[] = (
    (assignedRows ?? []) as ProjectMaterialJoin[]
  ).flatMap((row) => {
    const material = materialFromJoin(row.materials);

    if (!material) {
      return [];
    }

    const balance = balanceByMaterial.get(material.id);
    const currentMilli = milli(balance?.current_stock);
    const receivedMilli = milli(balance?.total_received);
    const usedMilli = milli(balance?.total_used);
    const returnedMilli = milli(balance?.total_returned);
    const purchasedPaise = paise(balance?.total_purchased_cost);
    const effectiveMinimum = row.minimum_stock ?? material.minimum_stock;
    const minimumMilli = effectiveMinimum
      ? parseQuantityToMilli(effectiveMinimum)
      : null;

    return [
      {
        assignment_id: row.id,
        project_id: row.project_id,
        material,
        planned_quantity: row.planned_quantity,
        minimum_stock: row.minimum_stock,
        effective_minimum_stock: effectiveMinimum,
        current_stock: formatMilli(currentMilli),
        total_received: formatMilli(receivedMilli),
        total_used: formatMilli(usedMilli),
        total_returned: formatMilli(returnedMilli),
        total_adjusted_increase: formatMilli(
          adjustedIncreaseByMaterial.get(material.id) ?? 0,
        ),
        total_adjusted_decrease: formatMilli(
          adjustedDecreaseByMaterial.get(material.id) ?? 0,
        ),
        last_adjustment: lastAdjustmentByMaterial.get(material.id) ?? null,
        latest_unit_price:
          latestPrice.get(material.id) ?? material.default_unit_price,
        vendor_name: vendorNames.get(material.id)?.join(", ") ?? null,
        stock_status: resolveStockStatus(currentMilli, minimumMilli),
        total_purchased_cost: formatPaise(purchasedPaise),
      },
    ];
  });

  assigned.sort((a, b) => {
    const aAdjusted = a.last_adjustment ? 1 : 0;
    const bAdjusted = b.last_adjustment ? 1 : 0;
    if (aAdjusted !== bAdjusted) {
      return bAdjusted - aAdjusted;
    }

    if (a.last_adjustment && b.last_adjustment) {
      const byDate = b.last_adjustment.date.localeCompare(a.last_adjustment.date);
      if (byDate !== 0) {
        return byDate;
      }
    }

    return a.material.name.localeCompare(b.material.name);
  });

  const { data: recentRows, error: recentError } = await supabase
    .from("material_transactions")
    .select(TRANSACTION_SELECT)
    .eq("business_id", projectResult.project.business_id)
    .eq("project_id", projectId)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(8);

  if (recentError) {
    return { dashboard: null, error: getMaterialErrorMessage(recentError) };
  }

  const costResult = await getProjectMaterialCostSummary(projectId, range);

  if (costResult.error === "not_found" || !costResult.summary) {
    return {
      dashboard: null,
      error: costResult.error === "not_found" ? "not_found" : costResult.error,
    };
  }

  let allTimeCost = 0;
  let stockValue = 0;
  let lowStock = 0;
  let outOfStock = 0;

  for (const row of assigned) {
    allTimeCost += paise(row.total_purchased_cost);
    const average = averageUnitPricePaise(
      paise(row.total_purchased_cost),
      milli(row.total_received),
    );
    stockValue += stockValuePaise(milli(row.current_stock), average ?? 0);

    if (row.stock_status === "out_of_stock") {
      outOfStock += 1;
    } else if (row.stock_status === "low_stock") {
      lowStock += 1;
    }
  }

  return {
    dashboard: {
      assigned,
      totals: {
        material_cost: formatPaise(allTimeCost),
        materials_in_use: assigned.length,
        low_stock: lowStock,
        out_of_stock: outOfStock,
        stock_value: formatPaise(stockValue),
      },
      cost: costResult.summary,
      recent_transactions: mapTransactionRows(recentRows ?? []),
    },
    error: null,
  };
}
