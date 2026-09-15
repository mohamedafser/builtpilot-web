import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import { AIRequestError, isAIRequestError } from "@/lib/ai/errors";
import { runAIChat } from "@/lib/ai/pipeline";
import { chatRequestSchema } from "@/lib/ai/schemas";
import { getZodErrorMessage } from "@/lib/validations/error";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      getZodErrorMessage(parsed.error, "Enter a question about your projects."),
      400,
    );
  }

  try {
    const result = await runAIChat({
      user: workspace.user,
      business: workspace.business,
      message: parsed.data.message,
      conversationId: parsed.data.conversationId,
      projectId: parsed.data.projectId,
    });

    return apiSuccess("BuildPilot AI responded.", result);
  } catch (error) {
    if (isAIRequestError(error) || error instanceof AIRequestError) {
      return apiError(error.message, error.status);
    }

    return apiError(
      "BuildPilot AI is temporarily unavailable. Please try again.",
      503,
    );
  }
}
