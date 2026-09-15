import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { listProjectWhatsAppMessages } from "@/lib/whatsapp/queries";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id } = await context.params;
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const result = await listProjectWhatsAppMessages(id, {
    limit: Number.isFinite(limit) ? limit : 20,
  });

  if (result.error === "Project not found.") {
    return apiError(result.error, 404);
  }

  if (result.error) {
    return apiError(result.error);
  }

  return apiSuccess("Message history loaded.", { items: result.items });
}
