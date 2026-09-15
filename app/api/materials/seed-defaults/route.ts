import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { importDefaultMaterials } from "@/lib/materials/defaults/seed";
import { revalidatePath } from "next/cache";

export async function POST() {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const result = await importDefaultMaterials({
    businessId: workspace.business.id,
    countryCode: workspace.business.country_code,
  });

  if (result.error) {
    return apiError(result.error, 500);
  }

  revalidatePath("/materials");

  return apiSuccess(
    result.seeded > 0
      ? `Imported ${result.seeded} default materials.`
      : "All default materials are already in your catalog.",
    { seeded: result.seeded },
  );
}
