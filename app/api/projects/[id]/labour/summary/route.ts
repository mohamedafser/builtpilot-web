import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import {
  getLabourSummary,
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
  const today = todayIsoDate();
  const from = parseLabourDate(searchParams.get("from") ?? startOfMonthIso(today));
  const to = parseLabourDate(searchParams.get("to") ?? today);
  const result = await getLabourSummary(id, from, to);

  if (result.error === "not_found") {
    return apiError("Project not found.", 404);
  }

  if (result.error) {
    return apiError(result.error, 400);
  }

  return apiSuccess("Labour summary loaded.", { summary: result.summary });
}
