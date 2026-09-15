import { apiError, apiSuccess } from "@/lib/api/response";
import { parsePagination } from "@/lib/api/pagination";
import { getApiWorkspace } from "@/lib/api/workspace";
import { createWorker } from "@/lib/workers/mutations";
import { getWorkers, parseWorkerSearchParams } from "@/lib/workers/queries";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { searchParams } = request.nextUrl;
  const { workers, error, page, pageSize, total, totalPages } =
    await getWorkers(
      parseWorkerSearchParams({
        q: searchParams.get("q") ?? undefined,
        status: searchParams.get("status") ?? undefined,
        role: searchParams.get("role") ?? undefined,
        project: searchParams.get("project") ?? undefined,
      }),
      parsePagination({
        page: searchParams.get("page"),
        page_size: searchParams.get("page_size"),
      }),
    );

  if (error) {
    return apiError(error, 500);
  }

  return apiSuccess("Workers loaded.", {
    workers,
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

  const result = await createWorker(values);

  if ("error" in result) {
    const status =
      result.status ??
      (result.error === "You must be signed in to continue." ? 401 : 400);
    return apiError(result.error, status);
  }

  revalidatePath("/workers");
  revalidatePath(`/workers/${result.id}`);
  return apiSuccess("Worker created.", { id: result.id }, 201);
}
