import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { saveAttendance } from "@/lib/labour/mutations";
import {
  getAttendanceSheet,
  parseLabourDate,
} from "@/lib/labour/queries";
import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id } = await context.params;
  const date = parseLabourDate(request.nextUrl.searchParams.get("date"));
  const result = await getAttendanceSheet(id, date);

  if (result.error === "not_found") {
    return apiError("Project not found.", 404);
  }

  if (result.error) {
    return apiError(result.error, 400);
  }

  return apiSuccess("Attendance loaded.", {
    date: result.date,
    rows: result.rows,
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
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

  const result = await saveAttendance(id, values);

  if ("error" in result) {
    const status =
      result.status ??
      (result.error === "Project not found."
        ? 404
        : result.error === "You must be signed in to continue."
          ? 401
          : 400);
    return apiError(result.error, status);
  }

  revalidatePath(`/projects/${id}`);
  revalidatePath(`/projects/${id}/labour`);
  revalidatePath(`/projects/${id}/labour/attendance`);
  return apiSuccess("Attendance saved.", { ok: true });
}
