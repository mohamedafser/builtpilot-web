import { getCurrentUser } from "@/lib/auth";
import {
  emptyToNull,
  getMaterialErrorMessage,
  isUuid,
  type MaterialMutationResult,
} from "@/lib/materials/helpers";
import { ensureProjectMaterial } from "@/lib/materials/project-mutations";
import {
  calculateLineCostPaise,
  formatMilli,
  formatPaise,
  insufficientStockMessage,
  parseMoneyToPaise,
  parseQuantityToMilli,
} from "@/lib/materials/stock";
import { getProjectMaterialStock } from "@/lib/material-transactions/queries";
import { syncReceiveMaterialActionAfterReceipt } from "@/lib/project-actions/workflows";
import { getProjectById } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import { getZodErrorMessage } from "@/lib/validations/error";
import {
  adjustMaterialSchema,
  receiveMaterialSchema,
  returnMaterialSchema,
  useMaterialSchema,
} from "@/lib/validations/material";
import type {
  AdjustmentDirection,
  Material,
  MaterialTransactionType,
  Vendor,
} from "@/types";

type ScopedEntities =
  | {
      ok: true;
      projectId: string;
      businessId: string;
      material: Material;
      vendor: Vendor | null;
      userId: string;
    }
  | { ok: false; error: string; status?: number };

async function loadScopedEntities(input: {
  projectId: string;
  materialId: string;
  vendorId?: string | null;
  requireVendor?: boolean;
}): Promise<ScopedEntities> {
  if (!isUuid(input.projectId)) {
    return { ok: false, error: "Project not found.", status: 404 };
  }

  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      error: "You must be signed in to continue.",
      status: 401,
    };
  }

  const projectResult = await getProjectById(input.projectId);

  if (projectResult.error === "not_found" || !projectResult.project) {
    return {
      ok: false,
      error:
        projectResult.error === "not_found"
          ? "Project not found."
          : (projectResult.error ?? "Project not found."),
      status: projectResult.error === "not_found" ? 404 : 400,
    };
  }

  const supabase = await createClient();
  const { data: material, error: materialError } = await supabase
    .from("materials")
    .select("*")
    .eq("id", input.materialId)
    .eq("business_id", projectResult.project.business_id)
    .maybeSingle();

  if (materialError) {
    return { ok: false, error: getMaterialErrorMessage(materialError) };
  }

  if (!material) {
    return { ok: false, error: "Material not found.", status: 404 };
  }

  if (material.status !== "active") {
    return {
      ok: false,
      error: "Inactive materials cannot be used for new transactions.",
      status: 400,
    };
  }

  let vendor: Vendor | null = null;

  if (input.vendorId) {
    const { data: vendorRow, error: vendorError } = await supabase
      .from("vendors")
      .select("*")
      .eq("id", input.vendorId)
      .eq("business_id", projectResult.project.business_id)
      .maybeSingle();

    if (vendorError) {
      return { ok: false, error: getMaterialErrorMessage(vendorError) };
    }

    if (!vendorRow) {
      return { ok: false, error: "Vendor not found.", status: 404 };
    }

    if (vendorRow.status !== "active") {
      return {
        ok: false,
        error: "Inactive vendors cannot be selected for new transactions.",
        status: 400,
      };
    }

    vendor = vendorRow;
  } else if (input.requireVendor) {
    return { ok: false, error: "Select a vendor.", status: 400 };
  }

  return {
    ok: true,
    projectId: input.projectId,
    businessId: projectResult.project.business_id,
    material,
    vendor,
    userId: user.id,
  };
}

async function latestUnitPrice(
  projectId: string,
  materialId: string,
  businessId: string,
  fallback: string | null,
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("material_transactions")
    .select("unit_price")
    .eq("business_id", businessId)
    .eq("project_id", projectId)
    .eq("material_id", materialId)
    .eq("transaction_type", "received")
    .not("unit_price", "is", null)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.unit_price ?? fallback;
}

async function insertTransaction(input: {
  projectId: string;
  businessId: string;
  materialId: string;
  vendorId: string | null;
  type: MaterialTransactionType;
  quantity: string;
  unitPrice: string | null;
  date: string;
  reference?: string | null;
  notes?: string | null;
  direction?: AdjustmentDirection | null;
  userId: string;
}): Promise<MaterialMutationResult> {
  const quantityMilli = parseQuantityToMilli(input.quantity);

  if (quantityMilli === null || quantityMilli <= 0) {
    return { error: "Quantity must be greater than 0." };
  }

  const unitPricePaise = input.unitPrice
    ? parseMoneyToPaise(input.unitPrice)
    : null;

  if (input.unitPrice && unitPricePaise === null) {
    return { error: "Unit price must be 0 or greater." };
  }

  const totalCost =
    unitPricePaise === null
      ? null
      : formatPaise(calculateLineCostPaise(quantityMilli, unitPricePaise));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("material_transactions")
    .insert({
      business_id: input.businessId,
      project_id: input.projectId,
      material_id: input.materialId,
      vendor_id: input.vendorId,
      transaction_type: input.type,
      quantity: formatMilli(quantityMilli),
      unit_price: unitPricePaise === null ? null : formatPaise(unitPricePaise),
      total_cost: totalCost,
      transaction_date: input.date,
      reference_number: input.reference,
      notes: input.notes,
      adjustment_direction: input.direction ?? null,
      created_by: input.userId,
    })
    .select("id")
    .single();

  if (error) {
    return { error: getMaterialErrorMessage(error) };
  }

  return { success: true, id: data.id };
}

async function rejectIfInsufficient(
  projectId: string,
  material: Material,
  quantity: string,
): Promise<{ error: string; status?: number } | null> {
  const quantityMilli = parseQuantityToMilli(quantity);

  if (quantityMilli === null || quantityMilli <= 0) {
    return { error: "Quantity must be greater than 0." };
  }

  const stock = await getProjectMaterialStock(projectId, material.id);

  if (stock.error === "not_found") {
    return { error: "Project not found.", status: 404 };
  }

  if (stock.error) {
    return { error: stock.error };
  }

  if (quantityMilli > stock.stockMilli) {
    return {
      error: insufficientStockMessage(stock.stockMilli, material.unit),
      status: 400,
    };
  }

  return null;
}

export async function receiveMaterial(
  projectId: string,
  values: unknown,
): Promise<MaterialMutationResult> {
  const parsed = receiveMaterialSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Invalid receipt details."),
    };
  }

  const vendorId = parsed.data.vendor_id || null;
  const scoped = await loadScopedEntities({
    projectId,
    materialId: parsed.data.material_id,
    vendorId,
  });

  if (!scoped.ok) {
    return { error: scoped.error, status: scoped.status };
  }

  const ensured = await ensureProjectMaterial(
    scoped.projectId,
    scoped.material.id,
    scoped.businessId,
  );

  if ("error" in ensured) {
    return ensured;
  }

  const result = await insertTransaction({
    projectId: scoped.projectId,
    businessId: scoped.businessId,
    materialId: scoped.material.id,
    vendorId: scoped.vendor?.id ?? null,
    type: "received",
    quantity: parsed.data.quantity,
    unitPrice: emptyToNull(parsed.data.unit_price),
    date: parsed.data.transaction_date,
    reference: emptyToNull(parsed.data.reference_number),
    notes: emptyToNull(parsed.data.notes),
    userId: scoped.userId,
  });

  if ("error" in result) {
    return result;
  }

  void syncReceiveMaterialActionAfterReceipt({
    projectId: scoped.projectId,
    materialId: scoped.material.id,
    businessId: scoped.businessId,
    userId: scoped.userId,
  });

  return result;
}

export async function recordMaterialUsage(
  projectId: string,
  values: unknown,
): Promise<MaterialMutationResult> {
  const parsed = useMaterialSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Invalid usage details."),
    };
  }

  const vendorId = parsed.data.vendor_id || null;
  const scoped = await loadScopedEntities({
    projectId,
    materialId: parsed.data.material_id,
    vendorId,
  });

  if (!scoped.ok) {
    return { error: scoped.error, status: scoped.status };
  }

  const stockError = await rejectIfInsufficient(
    scoped.projectId,
    scoped.material,
    parsed.data.quantity,
  );

  if (stockError) {
    return stockError;
  }

  const unitPrice = await latestUnitPrice(
    scoped.projectId,
    scoped.material.id,
    scoped.businessId,
    scoped.material.default_unit_price,
  );

  return insertTransaction({
    projectId: scoped.projectId,
    businessId: scoped.businessId,
    materialId: scoped.material.id,
    vendorId: scoped.vendor?.id ?? null,
    type: "used",
    quantity: parsed.data.quantity,
    unitPrice,
    date: parsed.data.transaction_date,
    notes: emptyToNull(parsed.data.notes),
    userId: scoped.userId,
  });
}

export async function returnMaterial(
  projectId: string,
  values: unknown,
): Promise<MaterialMutationResult> {
  const parsed = returnMaterialSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Invalid return details."),
    };
  }

  const scoped = await loadScopedEntities({
    projectId,
    materialId: parsed.data.material_id,
  });

  if (!scoped.ok) {
    return { error: scoped.error, status: scoped.status };
  }

  const ensured = await ensureProjectMaterial(
    scoped.projectId,
    scoped.material.id,
    scoped.businessId,
  );

  if ("error" in ensured) {
    return ensured;
  }

  return insertTransaction({
    projectId: scoped.projectId,
    businessId: scoped.businessId,
    materialId: scoped.material.id,
    vendorId: null,
    type: "returned",
    quantity: parsed.data.quantity,
    unitPrice: null,
    date: parsed.data.transaction_date,
    notes: emptyToNull(parsed.data.notes),
    userId: scoped.userId,
  });
}

export async function adjustMaterialStock(
  projectId: string,
  values: unknown,
): Promise<MaterialMutationResult> {
  const parsed = adjustMaterialSchema.safeParse(values);

  if (!parsed.success) {
    return {
      error: getZodErrorMessage(parsed.error, "Invalid adjustment details."),
    };
  }

  const scoped = await loadScopedEntities({
    projectId,
    materialId: parsed.data.material_id,
  });

  if (!scoped.ok) {
    return { error: scoped.error, status: scoped.status };
  }

  if (parsed.data.adjustment_direction === "decrease") {
    const stockError = await rejectIfInsufficient(
      scoped.projectId,
      scoped.material,
      parsed.data.quantity,
    );

    if (stockError) {
      return stockError;
    }
  } else {
    const ensured = await ensureProjectMaterial(
      scoped.projectId,
      scoped.material.id,
      scoped.businessId,
    );

    if ("error" in ensured) {
      return ensured;
    }
  }

  return insertTransaction({
    projectId: scoped.projectId,
    businessId: scoped.businessId,
    materialId: scoped.material.id,
    vendorId: null,
    type: "adjusted",
    quantity: parsed.data.quantity,
    unitPrice: null,
    date: parsed.data.transaction_date,
    notes: parsed.data.notes.trim(),
    direction: parsed.data.adjustment_direction,
    userId: scoped.userId,
  });
}
