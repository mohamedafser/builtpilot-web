import { apiError, apiSuccess } from "@/lib/api/response";
import { parsePagination } from "@/lib/api/pagination";
import { getApiWorkspace } from "@/lib/api/workspace";
import { createMaterial } from "@/lib/materials/mutations";
import { getMaterials, parseMaterialSearchParams } from "@/lib/materials/queries";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { searchParams } = request.nextUrl;
  const { materials, error, page, pageSize, total, totalPages } =
    await getMaterials(
      parseMaterialSearchParams({
        q: searchParams.get("q") ?? undefined,
        status: searchParams.get("status") ?? undefined,
        category: searchParams.get("category") ?? undefined,
      }),
      parsePagination({
        page: searchParams.get("page"),
        page_size: searchParams.get("page_size"),
      }),
    );

  if (error) {
    return apiError(error, 500);
  }

  return apiSuccess("Materials loaded.", {
    materials,
    page,
    pageSize,
    total,
    totalPages,
  });
}

export async function POST(request: NextRequest) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  let values: unknown;

  try {
    values = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const result = await createMaterial(values);

  if ("error" in result) {
    const status =
      result.status ??
      (result.error === "You must be signed in to continue." ? 401 : 400);
    return apiError(result.error, status);
  }

  revalidatePath("/materials");
  revalidatePath(`/materials/${result.id}`);
  return apiSuccess("Material created.", { id: result.id }, 201);
}
