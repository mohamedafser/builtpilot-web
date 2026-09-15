import {
  MAX_CONVERSATION_TITLE_LENGTH,
  MAX_HISTORY_MESSAGES,
} from "@/constants/ai";
import { canAccessConversation } from "@/lib/ai/authorization";
import { isMissingSchemaError } from "@/lib/auth/errors";
import { getProjectById, getWorkspaceScope } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import type { AIConversation } from "@/types";
import type { AIChatMessage, AIConversationSummary } from "@/lib/ai/types";

export function getAIStoreErrorMessage(error: {
  message: string;
  code?: string;
}): string {
  const normalized = `${error.message ?? ""} ${error.code ?? ""}`.toLowerCase();

  if (
    /permission denied|rls|row level security|not authorized/i.test(normalized)
  ) {
    return "AI access is blocked by the current workspace permissions. Check your BuildPilot membership and Supabase policies.";
  }

  if (
    isMissingSchemaError(error) ||
    error.code === "42P01" ||
    error.code === "42703" ||
    /ai_(conversations|messages|usage)/i.test(error.message) ||
    /(relation|table|column).*ai_|does not exist|schema cache|not found in schema/i.test(
      normalized,
    )
  ) {
    return "The database schema is not fully set up. Run the latest Supabase migration.";
  }

  return "Unable to load BuildPilot AI right now. Please try again.";
}

function titleFromMessage(message: string): string {
  const compact = message.replace(/\s+/g, " ").trim();
  if (compact.length <= MAX_CONVERSATION_TITLE_LENGTH) {
    return compact || "New chat";
  }

  return `${compact.slice(0, MAX_CONVERSATION_TITLE_LENGTH - 1).trim()}…`;
}

export async function listConversations(input: {
  userId: string;
  businessId: string;
  projectId?: string;
}): Promise<{ conversations: AIConversationSummary[]; error: string | null }> {
  const supabase = await createClient();
  let query = supabase
    .from("ai_conversations")
    .select("*")
    .eq("business_id", input.businessId)
    .eq("user_id", input.userId)
    .order("updated_at", { ascending: false })
    .limit(40);

  if (input.projectId) {
    query = query.eq("project_id", input.projectId);
  }

  const { data, error } = await query;

  if (error) {
    return { conversations: [], error: getAIStoreErrorMessage(error) };
  }

  const rows = (data ?? []) as AIConversation[];
  const projectIds = [
    ...new Set(
      rows
        .map((row) => row.project_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const names = new Map<string, string>();

  if (projectIds.length > 0) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name")
      .eq("business_id", input.businessId)
      .in("id", projectIds);

    for (const project of projects ?? []) {
      names.set(project.id, project.name);
    }
  }

  return {
    conversations: rows.map((row) => ({
      id: row.id,
      project_id: row.project_id,
      title: row.title,
      created_at: row.created_at,
      updated_at: row.updated_at,
      project_name: row.project_id ? (names.get(row.project_id) ?? null) : null,
    })),
    error: null,
  };
}

export async function getOwnedConversation(input: {
  conversationId: string;
  userId: string;
  businessId: string;
}): Promise<
  | { conversation: AIConversation; error: null }
  | { conversation: null; error: "not_found" }
  | { conversation: null; error: string }
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("*")
    .eq("id", input.conversationId)
    .eq("business_id", input.businessId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (error) {
    return { conversation: null, error: getAIStoreErrorMessage(error) };
  }

  if (!data) {
    return { conversation: null, error: "not_found" };
  }

  if (
    !canAccessConversation({
      userId: input.userId,
      userBusinessId: input.businessId,
      conversationUserId: data.user_id,
      conversationBusinessId: data.business_id,
    })
  ) {
    return { conversation: null, error: "not_found" };
  }

  return { conversation: data, error: null };
}

export async function createConversation(input: {
  userId: string;
  businessId: string;
  projectId?: string;
  title?: string;
}): Promise<
  | { conversation: AIConversation; error: null }
  | { conversation: null; error: string; status?: number }
> {
  const scope = await getWorkspaceScope();

  if (!scope.ok || scope.business.id !== input.businessId) {
    return {
      conversation: null,
      error: "No business workspace was found for this account.",
      status: 403,
    };
  }

  if (input.projectId) {
    const project = await getProjectById(input.projectId);

    if (project.error === "not_found" || !project.project) {
      return {
        conversation: null,
        error: "You don't have access to this project.",
        status: 404,
      };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({
      business_id: input.businessId,
      user_id: input.userId,
      project_id: input.projectId ?? null,
      title: input.title?.trim() || "New chat",
    })
    .select("*")
    .single();

  if (error || !data) {
    return {
      conversation: null,
      error: error
        ? getAIStoreErrorMessage(error)
        : "Unable to start a conversation.",
    };
  }

  return { conversation: data, error: null };
}

export async function renameConversation(input: {
  conversationId: string;
  userId: string;
  businessId: string;
  title: string;
}): Promise<{ error: string | null; status?: number }> {
  const owned = await getOwnedConversation(input);

  if (owned.error === "not_found" || !owned.conversation) {
    return {
      error:
        owned.error === "not_found"
          ? "You don't have access to this conversation."
          : owned.error,
      status: 404,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_conversations")
    .update({ title: input.title })
    .eq("id", input.conversationId)
    .eq("business_id", input.businessId)
    .eq("user_id", input.userId);

  if (error) {
    return { error: getAIStoreErrorMessage(error) };
  }

  return { error: null };
}

export async function deleteConversation(input: {
  conversationId: string;
  userId: string;
  businessId: string;
}): Promise<{ error: string | null; status?: number }> {
  const owned = await getOwnedConversation(input);

  if (owned.error === "not_found" || !owned.conversation) {
    return {
      error:
        owned.error === "not_found"
          ? "You don't have access to this conversation."
          : owned.error,
      status: 404,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", input.conversationId)
    .eq("business_id", input.businessId)
    .eq("user_id", input.userId);

  if (error) {
    return { error: getAIStoreErrorMessage(error) };
  }

  return { error: null };
}

export async function listMessages(input: {
  conversationId: string;
  userId: string;
  businessId: string;
  limit?: number;
}): Promise<{
  messages: AIChatMessage[];
  error: string | null;
  status?: number;
}> {
  const owned = await getOwnedConversation(input);

  if (owned.error === "not_found" || !owned.conversation) {
    return {
      messages: [],
      error:
        owned.error === "not_found"
          ? "You don't have access to this conversation."
          : owned.error,
      status: 404,
    };
  }

  const limit = input.limit ?? 40;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", input.conversationId)
    .eq("business_id", input.businessId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { messages: [], error: getAIStoreErrorMessage(error) };
  }

  return {
    messages: ((data ?? []) as AIChatMessage[]).slice().reverse(),
    error: null,
  };
}

export async function appendMessage(input: {
  conversationId: string;
  businessId: string;
  role: "user" | "assistant";
  content: string;
}): Promise<{ message: AIChatMessage | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_messages")
    .insert({
      conversation_id: input.conversationId,
      business_id: input.businessId,
      role: input.role,
      content: input.content.slice(0, 20000),
    })
    .select("id, role, content, created_at")
    .single();

  if (error || !data) {
    return {
      message: null,
      error: error
        ? getAIStoreErrorMessage(error)
        : "Unable to save this message.",
    };
  }

  await supabase
    .from("ai_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.conversationId)
    .eq("business_id", input.businessId);

  return { message: data as AIChatMessage, error: null };
}

export async function bindConversationProject(input: {
  conversationId: string;
  userId: string;
  businessId: string;
  projectId: string;
}): Promise<
  | { conversation: AIConversation; error: null }
  | { conversation: null; error: string; status: number }
> {
  const owned = await getOwnedConversation({
    conversationId: input.conversationId,
    userId: input.userId,
    businessId: input.businessId,
  });

  if (owned.error === "not_found" || !owned.conversation) {
    return {
      conversation: null,
      error: "You don't have access to this conversation.",
      status: 404,
    };
  }

  const project = await getProjectById(input.projectId);

  if (project.error === "not_found" || !project.project) {
    return {
      conversation: null,
      error: "You don't have access to this project.",
      status: 404,
    };
  }

  if (owned.conversation.project_id === input.projectId) {
    return { conversation: owned.conversation, error: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_conversations")
    .update({
      project_id: input.projectId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.conversationId)
    .eq("business_id", input.businessId)
    .eq("user_id", input.userId)
    .select("*")
    .single();

  if (error || !data) {
    return {
      conversation: null,
      error: error
        ? getAIStoreErrorMessage(error)
        : "Unable to switch this conversation to that project.",
      status: 500,
    };
  }

  return { conversation: data as AIConversation, error: null };
}

export async function ensureConversation(input: {
  userId: string;
  businessId: string;
  conversationId?: string;
  projectId?: string;
  firstMessage: string;
}): Promise<
  | { conversation: AIConversation; history: AIChatMessage[]; error: null }
  | { conversation: null; history: []; error: string; status: number }
> {
  if (input.conversationId) {
    const owned = await getOwnedConversation({
      conversationId: input.conversationId,
      userId: input.userId,
      businessId: input.businessId,
    });

    if (owned.error === "not_found" || !owned.conversation) {
      return {
        conversation: null,
        history: [],
        error: "You don't have access to this conversation.",
        status: 404,
      };
    }

    if (input.projectId && owned.conversation.project_id !== input.projectId) {
      const bound = await bindConversationProject({
        conversationId: owned.conversation.id,
        userId: input.userId,
        businessId: input.businessId,
        projectId: input.projectId,
      });

      if (!bound.conversation) {
        return {
          conversation: null,
          history: [],
          error:
            bound.error ??
            "Unable to switch this conversation to that project.",
          status: bound.status ?? 400,
        };
      }

      owned.conversation = bound.conversation;
    }

    const messages = await listMessages({
      conversationId: owned.conversation.id,
      userId: input.userId,
      businessId: input.businessId,
      limit: MAX_HISTORY_MESSAGES,
    });

    return {
      conversation: owned.conversation,
      history: messages.messages,
      error: null,
    };
  }

  const created = await createConversation({
    userId: input.userId,
    businessId: input.businessId,
    projectId: input.projectId,
    title: titleFromMessage(input.firstMessage),
  });

  if (!created.conversation) {
    return {
      conversation: null,
      history: [],
      error: created.error ?? "Unable to start a conversation.",
      status: created.status ?? 400,
    };
  }

  return { conversation: created.conversation, history: [], error: null };
}
