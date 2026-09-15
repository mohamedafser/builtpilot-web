import { apiError, apiSuccess } from "@/lib/api/response";
import { parsePagination } from "@/lib/api/pagination";
import { getApiWorkspace } from "@/lib/api/workspace";
import { createDailyReport } from "@/lib/daily-reports/mutations";
import {
  getDailyReports,
  parseDailyReportSearchParams,
} from "@/lib/daily-reports/queries";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function revalidatePaths(projectId: string, reportId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/reports`);

  if (reportId) {
    revalidatePath(`/projects/${projectId}/reports/${reportId}`);
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id } = await context.params;
  const { searchParams } = request.nextUrl;
  const { reports, error, page, pageSize, total, totalPages } =
    await getDailyReports(
      id,
      parseDailyReportSearchParams({
        q: searchParams.get("q") ?? undefined,
        from: searchParams.get("from") ?? undefined,
        to: searchParams.get("to") ?? undefined,
        archived: searchParams.get("archived") ?? undefined,
      }),
      parsePagination({
        page: searchParams.get("page"),
        page_size: searchParams.get("page_size"),
      }),
    );

  if (error === "not_found") {
    return apiError("Project not found.", 404);
  }

  if (error) {
    return apiError(error, 500);
  }

  return apiSuccess("Daily reports loaded.", {
    reports,
    page,
    pageSize,
    total,
    totalPages,
  });
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

  const result = await createDailyReport(id, values);

  if ("error" in result) {
    const status =
      result.status ??
      (result.error === "You must be signed in to continue." ? 401 : 400);
    return apiError(result.error, status);
  }

  revalidatePaths(id, result.id);
  return apiSuccess("Daily report created.", { id: result.id }, 201);
}
