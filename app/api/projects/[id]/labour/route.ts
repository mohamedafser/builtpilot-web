import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import {
  getProjectLabourDashboard,
  parseLabourDate,
  startOfMonthIso,
  todayIsoDate,
} from "@/lib/labour";
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
  const { searchParams } = request.nextUrl;
  const date = parseLabourDate(searchParams.get("date"));
  const from = searchParams.get("from") ?? startOfMonthIso(date);
  const to = searchParams.get("to") ?? todayIsoDate();
  const result = await getProjectLabourDashboard(id, { date, from, to });

  if (result.error === "not_found") {
    return apiError("Project not found.", 404);
  }

  if (!result.dashboard) {
    return apiError(result.error, 400);
  }

  return apiSuccess("Labour loaded.", result.dashboard);
}
