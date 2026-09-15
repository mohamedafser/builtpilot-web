import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { isWhatsAppFeatureEnabled } from "@/lib/whatsapp/feature";
import {
  getProjectCommunicationState,
} from "@/lib/whatsapp/queries";
import { updateProjectWhatsAppSettings } from "@/lib/whatsapp/mutations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  if (!isWhatsAppFeatureEnabled()) {
    return apiError(
      "WhatsApp messaging is temporarily unavailable. Share the portal link instead.",
      503,
    );
  }

  const { id } = await context.params;
  const result = await getProjectCommunicationState(id);

  if (result.error === "not_found") {
    return apiError("Project not found.", 404);
  }

  if (result.error || !result.state) {
    return apiError(result.error ?? "Unable to load communication settings.");
  }

  return apiSuccess("Communication settings loaded.", result.state);
}

export async function PATCH(request: Request, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  if (!isWhatsAppFeatureEnabled()) {
    return apiError(
      "WhatsApp messaging is temporarily unavailable. Share the portal link instead.",
      503,
    );
  }

  const { id } = await context.params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body.");
  }

  const result = await updateProjectWhatsAppSettings(id, body);

  if ("error" in result) {
    return apiError(result.error, result.status ?? 400);
  }

  const state = await getProjectCommunicationState(id);
  return apiSuccess("WhatsApp settings saved.", state.state);
}
