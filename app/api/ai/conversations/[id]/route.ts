import { apiError, apiSuccess } from "@/lib/api/response";
import { getApiWorkspace } from "@/lib/api/workspace";
import {
  deleteConversation,
  getOwnedConversation,
  listMessages,
  renameConversation,
} from "@/lib/ai/conversations";
import { conversationUpdateSchema } from "@/lib/ai/schemas";
import { isUuid } from "@/lib/projects/helpers";
import { getZodErrorMessage } from "@/lib/validations/error";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id } = await context.params;

  if (!isUuid(id)) {
    return apiError("You don't have access to this conversation.", 404);
  }

  const owned = await getOwnedConversation({
    conversationId: id,
    userId: workspace.user.id,
    businessId: workspace.business.id,
  });

  if (owned.error === "not_found" || !owned.conversation) {
    return apiError("You don't have access to this conversation.", 404);
  }

  const messages = await listMessages({
    conversationId: id,
    userId: workspace.user.id,
    businessId: workspace.business.id,
    limit: 80,
  });

  if (messages.error) {
    return apiError(messages.error, messages.status ?? 400);
  }

  return apiSuccess("Conversation loaded.", {
    conversation: {
      id: owned.conversation.id,
      project_id: owned.conversation.project_id,
      title: owned.conversation.title,
      created_at: owned.conversation.created_at,
      updated_at: owned.conversation.updated_at,
      project_name: null,
    },
    messages: messages.messages,
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id } = await context.params;

  if (!isUuid(id)) {
    return apiError("You don't have access to this conversation.", 404);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const parsed = conversationUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      getZodErrorMessage(parsed.error, "Title is required."),
      400,
    );
  }

  const result = await renameConversation({
    conversationId: id,
    userId: workspace.user.id,
    businessId: workspace.business.id,
    title: parsed.data.title,
  });

  if (result.error) {
    return apiError(result.error, result.status ?? 400);
  }

  return apiSuccess("Conversation renamed.", { id, title: parsed.data.title });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const workspace = await getApiWorkspace();

  if (!workspace.ok) {
    return apiError(workspace.message, workspace.status);
  }

  const { id } = await context.params;

  if (!isUuid(id)) {
    return apiError("You don't have access to this conversation.", 404);
  }

  const result = await deleteConversation({
    conversationId: id,
    userId: workspace.user.id,
    businessId: workspace.business.id,
  });

  if (result.error) {
    return apiError(result.error, result.status ?? 400);
  }

  return apiSuccess("Conversation deleted.", { id });
}
