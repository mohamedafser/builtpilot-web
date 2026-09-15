import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import {
  getQuotationTemplateById,
  listQuotationTemplates,
} from "@/lib/quotation-templates/queries";
import { saveQuotationTemplate } from "@/lib/quotation-templates/mutations";
import { saveQuotationTemplateSchema } from "@/lib/validations/quotation-template";
import { getZodErrorMessage } from "@/lib/validations/error";

export async function GET(request: Request) {
  const workspace = await getApiWorkspace();
  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country");
  const templateId = searchParams.get("id");

  if (templateId) {
    const result = await getQuotationTemplateById({
      businessId: workspace.business.id,
      templateId,
    });

    if (result.error || !result.template) {
      return apiError(result.error ?? "Template not found.", 404);
    }

    return apiSuccess("Template loaded.", { template: result.template });
  }

  const result = await listQuotationTemplates({
    businessId: workspace.business.id,
    countryCode: country || workspace.business.country_code,
  });

  return apiSuccess("Templates loaded.", {
    templates: result.templates,
    countryCode: country || workspace.business.country_code,
    currencyCode: workspace.business.currency_code,
  });
}

export async function POST(request: Request) {
  const workspace = await getApiWorkspace();
  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body.");
  }

  const parsed = saveQuotationTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      getZodErrorMessage(parsed.error, "Invalid template details."),
    );
  }

  const result = await saveQuotationTemplate(parsed.data);
  if ("error" in result) {
    return apiError(result.error, result.status ?? 400);
  }

  return apiSuccess("Template saved.", { id: result.id }, 201);
}
