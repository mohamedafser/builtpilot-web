import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { buildDailyReportClientMessage } from "@/lib/communication/client-update";
import { getDailyReport } from "@/lib/daily-reports/queries";
import { getContractorClientPortal } from "@/lib/client-portal/queries";
import { getProjectById } from "@/lib/projects/queries";

type RouteContext = {
  params: Promise<{ id: string; reportId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id, reportId } = await context.params;
  const project = await getProjectById(id);

  if (project.error === "not_found" || !project.project) {
    return apiError("Project not found.", 404);
  }

  const detail = await getDailyReport(id, reportId);

  if (detail.error === "not_found" || !detail.detail) {
    return apiError("Daily report not found.", 404);
  }

  const portal = await getContractorClientPortal(id);
  const clientName = portal.state?.access?.client_name ?? "there";

  const message = buildDailyReportClientMessage({
    clientName,
    projectName: project.project.name,
    detail: detail.detail,
    includeManpower: true,
  });

  return apiSuccess("Daily report update preview ready.", {
    message,
    project_id: id,
    report_id: reportId,
    client_name: clientName,
  });
}
