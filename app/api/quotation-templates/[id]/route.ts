import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { deleteQuotationTemplate } from "@/lib/quotation-templates/mutations";
import { getQuotationTemplateById } from "@/lib/quotation-templates/queries";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const workspace = await getApiWorkspace();
  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id } = await context.params;
  const templateId = decodeURIComponent(id);
  const result = await getQuotationTemplateById({
    businessId: workspace.business.id,
    templateId,
  });

  if (result.error || !result.template) {
    return apiError(result.error ?? "Template not found.", 404);
  }

  return apiSuccess("Template loaded.", { template: result.template });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const workspace = await getApiWorkspace();
  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id } = await context.params;
  const templateId = decodeURIComponent(id);

  if (!templateId.startsWith("custom:")) {
    return apiError("Built-in templates cannot be deleted.");
  }

  const result = await deleteQuotationTemplate(templateId);
  if ("error" in result) {
    return apiError(result.error, result.status ?? 400);
  }

  return apiSuccess("Template deleted.", { ok: true });
}
