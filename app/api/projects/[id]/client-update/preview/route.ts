import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { buildReviewedClientUpdate } from "@/lib/communication/client-update";
import { getContractorClientPortal } from "@/lib/client-portal/queries";
import type { ClientUpdateDraft } from "@/lib/ai/types";
import { z } from "zod";

const draftSchema = z.object({
  title: z.string().trim().min(1).max(160),
  this_week: z.array(z.string().trim().max(200)).max(12),
  current_progress: z.string().trim().max(200).nullable(),
  upcoming: z.array(z.string().trim().max(200)).max(12),
  issues: z.array(z.string().trim().max(200)).max(12),
  closing: z.string().trim().max(400).optional().default(""),
  portalUrl: z.string().url().optional().nullable(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id } = await context.params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body.");
  }

  const parsed = draftSchema.safeParse(body);

  if (!parsed.success) {
    return apiError("Invalid client update draft.");
  }

  const portal = await getContractorClientPortal(id);

  if (portal.error === "not_found" || !portal.state) {
    return apiError(
      portal.error === "not_found" ? "Project not found." : portal.error,
      portal.error === "not_found" ? 404 : 400,
    );
  }

  const draft: ClientUpdateDraft = {
    title: parsed.data.title,
    this_week: parsed.data.this_week,
    current_progress: parsed.data.current_progress,
    upcoming: parsed.data.upcoming,
    issues: parsed.data.issues,
    closing: parsed.data.closing,
  };

  const includeCost = portal.state.settings.show_project_cost;
  const message = buildReviewedClientUpdate({
    clientName: portal.state.access?.client_name ?? "there",
    projectName: portal.state.project_name,
    draft,
    portalUrl: parsed.data.portalUrl,
    includeCost,
  });

  return apiSuccess("Client update preview ready.", {
    message,
    project_id: id,
    client_name: portal.state.access?.client_name ?? null,
  });
}
