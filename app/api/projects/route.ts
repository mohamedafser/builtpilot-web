import { apiError, apiSuccess } from "@/lib/api/response";
import { parsePagination } from "@/lib/api/pagination";
import { getApiWorkspace, requireApiPermission } from "@/lib/api/workspace";
import { hasPermission } from "@/lib/permissions";
import { createProject } from "@/lib/projects/mutations";
import { getProjects, parseProjectSearchParams } from "@/lib/projects/queries";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  if (!hasPermission(workspace.role, "projects.view")) {
    return apiError("You do not have permission for this action.", 403);
  }

  const { searchParams } = request.nextUrl;
  const { projects, error, page, pageSize, total, totalPages } =
    await getProjects(
      parseProjectSearchParams({
        q: searchParams.get("q") ?? undefined,
        status: searchParams.get("status") ?? undefined,
        archived: searchParams.get("archived") ?? undefined,
      }),
      parsePagination({
        page: searchParams.get("page"),
        page_size: searchParams.get("page_size"),
      }),
    );

  if (error) {
    return apiError(error, 500);
  }

  return apiSuccess("Projects loaded.", {
    projects,
    page,
    pageSize,
    total,
    totalPages,
  });
}

export async function POST(request: NextRequest) {
  const workspace = await requireApiPermission("projects.create");

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  let values: unknown;

  try {
    values = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const result = await createProject(values);

  if ("error" in result) {
    const status =
      result.error === "You must be signed in to continue." ? 401 : 400;
    return apiError(result.error, status);
  }

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  if (result.id) {
    revalidatePath(`/projects/${result.id}`);
  }

  return apiSuccess("Project created.", { id: result.id }, 201);
}
