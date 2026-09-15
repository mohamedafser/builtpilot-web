import { getDefaultMaterialsForCountry } from "@/lib/materials/defaults/catalog";
import { getMaterialErrorMessage } from "@/lib/materials/helpers";
import { createClient } from "@/lib/supabase/server";

type SeedResult = { seeded: number; error: string | null };

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Inserts missing country default materials into the business catalog.
 * Skips names that already exist (case-insensitive). Safe to call repeatedly.
 */
export async function importDefaultMaterials(input: {
  businessId: string;
  countryCode?: string | null;
}): Promise<SeedResult> {
  const supabase = await createClient();
  const defaults = getDefaultMaterialsForCountry(input.countryCode);

  const { data: existing, error: existingError } = await supabase
    .from("materials")
    .select("name")
    .eq("business_id", input.businessId);

  if (existingError) {
    return { seeded: 0, error: getMaterialErrorMessage(existingError) };
  }

  const existingNames = new Set(
    (existing ?? []).map((row) => normalizeName(row.name)),
  );

  const rows = defaults
    .filter((item) => !existingNames.has(normalizeName(item.name)))
    .map((item) => ({
      business_id: input.businessId,
      name: item.name,
      category: item.category,
      unit: item.unit,
      default_unit_price: item.default_unit_price,
      minimum_stock: item.minimum_stock,
      notes: item.notes,
      status: "active" as const,
      vendor_id: null as string | null,
    }));

  if (rows.length === 0) {
    return { seeded: 0, error: null };
  }

  const { data, error } = await supabase
    .from("materials")
    .insert(rows)
    .select("id");

  if (error) {
    return { seeded: 0, error: getMaterialErrorMessage(error) };
  }

  return { seeded: data?.length ?? rows.length, error: null };
}

/** @deprecated Prefer importDefaultMaterials — kept for empty-catalog auto seed. */
export async function seedDefaultMaterialsIfEmpty(input: {
  businessId: string;
  countryCode?: string | null;
}): Promise<SeedResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials")
    .select("id")
    .eq("business_id", input.businessId)
    .limit(1);

  if (error) {
    return { seeded: 0, error: getMaterialErrorMessage(error) };
  }

  if ((data?.length ?? 0) > 0) {
    return { seeded: 0, error: null };
  }

  return importDefaultMaterials(input);
}
