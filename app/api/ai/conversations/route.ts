import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import {
  createConversation,
  listConversations,
} from "@/lib/ai/conversations";
import { conversationCreateSchema } from "@/lib/ai/schemas";
import { getZodErrorMessage } from "@/lib/validations/error";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const projectId = request.nextUrl.searchParams.get("projectId") ?? undefined;
  const result = await listConversations({
    userId: workspace.user.id,
    businessId: workspace.business.id,
    projectId,
  });

  if (result.error) {
    return apiError(result.error, 400);
  }

  return apiSuccess("Conversations loaded.", {
    conversations: result.conversations,
  });
}

export async function POST(request: NextRequest) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  let body: unknown = {};

  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const parsed = conversationCreateSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      getZodErrorMessage(parsed.error, "Unable to start a conversation."),
      400,
    );
  }

  const created = await createConversation({
    userId: workspace.user.id,
    businessId: workspace.business.id,
    projectId: parsed.data.projectId ?? undefined,
    title: parsed.data.title,
  });

  if (!created.conversation) {
    return apiError(created.error ?? "Unable to start a conversation.", created.status ?? 400);
  }

  return apiSuccess(
    "Conversation created.",
    {
      conversation: {
        id: created.conversation.id,
        project_id: created.conversation.project_id,
        title: created.conversation.title,
        created_at: created.conversation.created_at,
        updated_at: created.conversation.updated_at,
        project_name: null,
      },
    },
    201,
  );
}
