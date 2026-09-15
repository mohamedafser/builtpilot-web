import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { startOfMonthIso, todayIsoDate } from "@/lib/labour/money";
import { addMaterialToProject } from "@/lib/materials/project-mutations";
import { getProjectMaterialsDashboard } from "@/lib/materials/project-queries";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function revalidateMaterialPaths(projectId: string, materialId?: string) {
  revalidatePath("/materials");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/materials`);
  if (materialId) {
    revalidatePath(`/materials/${materialId}`);
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id } = await context.params;
  const { searchParams } = request.nextUrl;
  const today = todayIsoDate();
  const from = searchParams.get("from") ?? startOfMonthIso(today);
  const to = searchParams.get("to") ?? today;
  const result = await getProjectMaterialsDashboard(id, { from, to });

  if (result.error === "not_found") {
    return apiError("Project not found.", 404);
  }

  if (!result.dashboard) {
    return apiError(result.error, 400);
  }

  return apiSuccess("Project materials loaded.", result.dashboard);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id } = await context.params;
  let values: unknown;

  try {
    values = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const result = await addMaterialToProject(id, values);

  if ("error" in result) {
    const status =
      result.status ??
      (result.error === "Project not found."
        ? 404
        : result.error === "Material not found."
          ? 404
          : result.error === "You must be signed in to continue."
            ? 401
            : 400);
    return apiError(result.error, status);
  }

  revalidateMaterialPaths(id);
  return apiSuccess("Material added to project.", { id: result.id }, 201);
}
