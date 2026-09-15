/**
 * BuildPilot AI chat pipeline.
 *
 * Data flow (server-only):
 * 1. Authenticate the user and resolve their business membership.
 * 2. Classify intent and retrieve only authorized BuildPilot records.
 * 3. Build a minimal JSON context (no API keys, tokens, or unnecessary PII).
 * 4. Send that context to the configured AI provider.
 * 5. Validate structured output, save visible user/assistant messages, and log usage.
 *
 * The model never receives unrestricted database access. Construction writes
 * still go through existing mutations after explicit user confirmation.
 */
import { MAX_HISTORY_MESSAGES } from "@/constants/ai";
import { getAIProvider } from "@/lib/ai/client";
import {
  buildAIContext,
  contextHasGroundedData,
  listAIProjectOptions,
  resolveProjectIdFromQuery,
} from "@/lib/ai/context";
import { isAIProviderConfigured } from "@/lib/ai/env";
import { AIRequestError, AI_USER_ERRORS } from "@/lib/ai/errors";
import { formatClientUpdate, formatContextFallback, formatDailyReportDraft, formatMissing } from "@/lib/ai/formatters";
import { classifyIntent, wantsProjectSwitch } from "@/lib/ai/intent";
import {
  BUILDPILOT_SYSTEM_PROMPT,
  buildGroundedUserPrompt,
  buildHistoryMessages,
  clientUpdateDraftInstructions,
  dailyReportDraftInstructions,
} from "@/lib/ai/prompts";
import { checkAIRateLimit } from "@/lib/ai/rate-limit";
import { inspectUserMessage, sanitizeModelOutput } from "@/lib/ai/safety";
import {
  clientUpdateDraftSchema,
  dailyReportDraftSchema,
} from "@/lib/ai/schemas";
import {
  appendMessage,
  bindConversationProject,
  ensureConversation,
} from "@/lib/ai/conversations";
import { recordAIUsage } from "@/lib/ai/usage";
import { todayIsoDate } from "@/lib/labour/money";
import { getProjectById } from "@/lib/projects/queries";
import type {
  AIChatAction,
  AIChatResponse,
  AIContextPayload,
  AIProjectOption,
  ClientUpdateDraft,
  DailyReportDraft,
} from "@/lib/ai/types";
import type { User } from "@supabase/supabase-js";
import type { Business } from "@/types";

function lastUserMessage(
  history: Array<{ role: string; content: string }>,
): string | undefined {
  return [...history].reverse().find((message) => message.role === "user")
    ?.content;
}

async function resolveProject(input: {
  requestedProjectId?: string;
  conversationProjectId?: string | null;
  projectQuery?: string;
  ignoreBoundProject?: boolean;
}): Promise<{
  projectId?: string;
  projectName?: string;
  error?: string;
  status?: number;
}> {
  if (input.projectQuery) {
    const resolved = await resolveProjectIdFromQuery(input.projectQuery);

    if (resolved && "projectId" in resolved) {
      return { projectId: resolved.projectId, projectName: resolved.name };
    }

    if (resolved && "matches" in resolved) {
      return {
        error: `I found more than one matching project: ${resolved.matches.join(", ")}. Choose one below.`,
      };
    }

    return {
      error: `I couldn't find a project matching “${input.projectQuery}”. Choose a project below.`,
    };
  }

  const candidate = input.ignoreBoundProject
    ? undefined
    : (input.requestedProjectId ?? input.conversationProjectId ?? undefined);

  if (candidate) {
    const result = await getProjectById(candidate);

    if (result.error === "not_found" || !result.project) {
      return {
        error: "You don't have access to this project.",
        status: 404,
      };
    }

    return { projectId: result.project.id, projectName: result.project.name };
  }

  return {};
}

function conversationSummary(
  conversation: {
    id: string;
    project_id: string | null;
    title: string;
    created_at: string;
    updated_at: string;
  },
  projectName: string | null,
) {
  return {
    id: conversation.id,
    project_id: conversation.project_id,
    title: conversation.title,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    project_name: projectName,
  };
}

async function projectChoiceResponse(input: {
  conversation: {
    id: string;
    project_id: string | null;
    title: string;
    created_at: string;
    updated_at: string;
  };
  intent: AIChatResponse["metadata"]["intent"];
  period: AIChatResponse["metadata"]["period"];
  content: string;
  projectName?: string | null;
}): Promise<AIChatResponse> {
  const projects: AIProjectOption[] = await listAIProjectOptions();

  return {
    conversation: conversationSummary(
      input.conversation,
      input.projectName ?? null,
    ),
    message: {
      id: crypto.randomUUID(),
      role: "assistant",
      content: input.content,
      created_at: new Date().toISOString(),
    },
    metadata: {
      intent: input.intent,
      period: input.period,
      sources: [],
      grounded: false,
    },
    action: null,
    needsProject: true,
    projects,
  };
}

function answerFromContext(context: AIContextPayload): string | null {
  if (context.intent === "GENERAL_CONSTRUCTION") {
    return null;
  }

  if (!contextHasGroundedData(context) && context.missing.length > 0) {
    return formatMissing(context.missing[0] ?? AI_USER_ERRORS.missingData);
  }

  return null;
}

export async function runAIChat(input: {
  user: User;
  business: Business;
  message: string;
  conversationId?: string;
  projectId?: string;
}): Promise<AIChatResponse> {
  const rate = checkAIRateLimit(input.user.id, input.business.id);

  if (!rate.allowed) {
    throw new AIRequestError("rateLimited", 429);
  }

  const safety = inspectUserMessage(input.message);

  const conversationResult = await ensureConversation({
    userId: input.user.id,
    businessId: input.business.id,
    conversationId: input.conversationId,
    projectId: input.projectId,
    firstMessage: input.message,
  });

  if (!conversationResult.conversation) {
    throw new AIRequestError(
      conversationResult.status === 404 ? "unauthorizedConversation" : "database",
      conversationResult.status,
      conversationResult.error,
    );
  }

  let conversation = conversationResult.conversation;
  const history = conversationResult.history.slice(-MAX_HISTORY_MESSAGES);
  const lastHistory = history[history.length - 1];
  const alreadySavedUser =
    lastHistory?.role === "user" && lastHistory.content === input.message;

  const savedUser = alreadySavedUser
    ? { message: lastHistory, error: null }
    : await appendMessage({
        conversationId: conversation.id,
        businessId: input.business.id,
        role: "user",
        content: input.message,
      });

  if (!savedUser.message) {
    throw new AIRequestError("database", 500);
  }

  if (!safety.allowed) {
    const saved = await appendMessage({
      conversationId: conversation.id,
      businessId: input.business.id,
      role: "assistant",
      content: safety.message,
    });

    return {
      conversation: {
        id: conversation.id,
        project_id: conversation.project_id,
        title: conversation.title,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        project_name: null,
      },
      message: saved.message ?? {
        id: savedUser.message.id,
        role: "assistant",
        content: safety.message,
        created_at: new Date().toISOString(),
      },
      metadata: {
        intent: "UNKNOWN",
        period: null,
        sources: [],
        grounded: false,
      },
      action: null,
    };
  }

  const classified = classifyIntent(
    input.message,
    lastUserMessage(alreadySavedUser ? history.slice(0, -1) : history),
  );
  const switchRequested =
    wantsProjectSwitch(input.message) && !classified.projectQuery;

  const project = await resolveProject({
    requestedProjectId: input.projectId,
    conversationProjectId: conversation.project_id,
    projectQuery: classified.projectQuery,
    ignoreBoundProject: switchRequested,
  });

  if (project.error && project.status === 404) {
    throw new AIRequestError("unauthorizedProject", 404);
  }

  if (
    (classified.needsProject && !project.projectId) ||
    (switchRequested && !project.projectId)
  ) {
    return projectChoiceResponse({
      conversation,
      intent: classified.intent,
      period: classified.period.label === "current" ? null : classified.period,
      content: project.error ?? AI_USER_ERRORS.missingProject,
      projectName: project.projectName,
    });
  }

  if (project.projectId && conversation.project_id !== project.projectId) {
    const bound = await bindConversationProject({
      conversationId: conversation.id,
      userId: input.user.id,
      businessId: input.business.id,
      projectId: project.projectId,
    });

    if (bound.conversation) {
      conversation = bound.conversation;
    }
  }

  const context = await buildAIContext({
    classified,
    projectId: project.projectId,
  });

  const honest = answerFromContext(context);
  let action: AIChatAction | null = null;
  let content = honest;
  let model = "buildpilot-grounded";
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;

  if (!content && classified.intent === "DAILY_REPORT_GENERATION" && project.projectId) {
    const draft = await generateDailyReportDraft(input.message, context);
    content = formatDailyReportDraft(draft);
    action = {
      type: "daily_report_draft",
      projectId: project.projectId,
      draft,
    };
    model = "buildpilot-structured";
  }

  if (!content && classified.intent === "CLIENT_UPDATE" && project.projectId) {
    if (!contextHasGroundedData(context)) {
      content = formatMissing(
        context.missing[0] ?? "I don't have enough project data to write a client update.",
      );
    } else {
      const draft = await generateClientUpdateDraft(context);
      content = formatClientUpdate(draft);
      action = {
        type: "client_update_draft",
        projectId: project.projectId,
        draft,
      };
      model = "buildpilot-structured";
    }
  }

  if (!content) {
    const generated = await generateAnswer({
      question: input.message,
      context,
      history,
      projectName: project.projectName,
    });
    content = generated.text;
    model = generated.model;
    inputTokens = generated.inputTokens;
    outputTokens = generated.outputTokens;
  }

  const savedAssistant = await appendMessage({
    conversationId: conversation.id,
    businessId: input.business.id,
    role: "assistant",
    content,
  });

  if (!savedAssistant.message) {
    throw new AIRequestError("database", 500);
  }

  await recordAIUsage({
    businessId: input.business.id,
    userId: input.user.id,
    conversationId: conversation.id,
    model,
    inputTokens,
    outputTokens,
  });

  return {
    conversation: {
      id: conversation.id,
      project_id: conversation.project_id,
      title: conversation.title,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
      project_name: project.projectName ?? null,
    },
    message: savedAssistant.message,
    metadata: {
      intent: classified.intent,
      period: classified.period.label === "current" ? null : classified.period,
      sources: context.sources,
      grounded: contextHasGroundedData(context),
    },
    action,
  };
}

async function generateAnswer(input: {
  question: string;
  context: AIContextPayload;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  projectName?: string;
}): Promise<{
  text: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}> {
  if (!isAIProviderConfigured()) {
    return {
      text:
        input.context.intent === "GENERAL_CONSTRUCTION"
          ? AI_USER_ERRORS.notConfigured
          : formatContextFallback(input.context),
      model: "buildpilot-local",
      inputTokens: null,
      outputTokens: null,
    };
  }

  try {
    const provider = getAIProvider();
    const result = await provider.generateResponse({
      messages: [
        { role: "system", content: BUILDPILOT_SYSTEM_PROMPT },
        ...buildHistoryMessages(input.history),
        {
          role: "user",
          content: buildGroundedUserPrompt({
            question: input.question,
            context: input.context,
            projectName: input.projectName,
          }),
        },
      ],
    });

    return {
      text: sanitizeModelOutput(result.text),
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    };
  } catch (error) {
    if (error instanceof AIRequestError && error.key === "notConfigured") {
      return {
        text: formatContextFallback(input.context),
        model: "buildpilot-local",
        inputTokens: null,
        outputTokens: null,
      };
    }

    if (contextHasGroundedData(input.context)) {
      return {
        text: formatContextFallback(input.context),
        model: "buildpilot-local",
        inputTokens: null,
        outputTokens: null,
      };
    }

    throw error;
  }
}

async function generateDailyReportDraft(
  question: string,
  context: AIContextPayload,
): Promise<DailyReportDraft> {
  const fallback: DailyReportDraft = {
    report_date: todayIsoDate(),
    work_completed: question.trim(),
    issues: "",
    tomorrow_plan: "",
    general_notes: "",
  };

  if (!isAIProviderConfigured()) {
    return dailyReportDraftSchema.parse(fallback);
  }

  try {
    const provider = getAIProvider();
    const generated = await provider.generateStructuredResponse(
      {
        messages: [
          { role: "system", content: BUILDPILOT_SYSTEM_PROMPT },
          { role: "user", content: dailyReportDraftInstructions(question) },
          {
            role: "user",
            content: `Today's date is ${context.period.to}.`,
          },
        ],
      },
      (value) => dailyReportDraftSchema.parse(value),
    );
    return generated.value;
  } catch {
    return dailyReportDraftSchema.parse(fallback);
  }
}

async function generateClientUpdateDraft(
  context: AIContextPayload,
): Promise<ClientUpdateDraft> {
  const fallback: ClientUpdateDraft = {
    title: context.project
      ? `Project update — ${context.project.name}`
      : "Project update",
    this_week: (context.site_reports ?? [])
      .slice(0, 5)
      .map((report) => report.work_completed)
      .filter(Boolean),
    current_progress:
      context.boq?.completion_percentage != null
        ? `${context.boq.completion_percentage}% complete based on the active BOQ`
        : null,
    upcoming: (context.remaining_work ?? [])
      .slice(0, 5)
      .map((item) => item.description),
    issues: (context.site_reports ?? [])
      .map((report) => report.issues)
      .filter((value): value is string => Boolean(value?.trim())),
    closing: "Please review this draft before sharing it with the client.",
  };

  if (!isAIProviderConfigured()) {
    return clientUpdateDraftSchema.parse(fallback);
  }

  try {
    const provider = getAIProvider();
    const generated = await provider.generateStructuredResponse(
      {
        messages: [
          { role: "system", content: BUILDPILOT_SYSTEM_PROMPT },
          { role: "user", content: clientUpdateDraftInstructions(context) },
        ],
      },
      (value) => clientUpdateDraftSchema.parse(value),
    );
    return generated.value;
  } catch {
    return clientUpdateDraftSchema.parse(fallback);
  }
}
