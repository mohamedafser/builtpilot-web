"use client";

import { requestJson } from "@/lib/api/client";
import { classifyIntent, shouldAskForProject, wantsProjectSwitch } from "@/lib/ai/intent";
import type {
  AIChatAction,
  AIChatMessage,
  AIChatResponse,
  AIProjectOption,
} from "@/lib/ai/types";
import { useCallback, useEffect, useRef, useState } from "react";

function sourceLine(sources: AIChatResponse["metadata"]["sources"]): string | null {
  if (!sources.length) {
    return null;
  }

  return sources
    .map((source) =>
      source.count != null ? `${source.label} (${source.count})` : source.label,
    )
    .join(" · ");
}

function lastUserContent(messages: AIChatMessage[]): string | undefined {
  return [...messages].reverse().find((message) => message.role === "user")?.content;
}

function localUserMessage(content: string): AIChatMessage {
  return {
    id: `local-${Date.now()}`,
    role: "user",
    content,
    created_at: new Date().toISOString(),
  };
}

export type UseAIChatOptions = {
  initialProjectId?: string;
  initialProjectName?: string;
  onResponse?: () => void;
};

export function useAIChat(projectIdOrOptions?: string | UseAIChatOptions) {
  const options: UseAIChatOptions =
    typeof projectIdOrOptions === "string"
      ? { initialProjectId: projectIdOrOptions }
      : (projectIdOrOptions ?? {});
  const initialProjectId = options.initialProjectId;
  const initialProjectName = options.initialProjectName;

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<string | null>(null);
  const [action, setAction] = useState<AIChatAction | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(
    initialProjectId,
  );
  const [selectedProjectName, setSelectedProjectName] = useState<string | null>(
    initialProjectName ?? null,
  );
  const [needsProjectChoice, setNeedsProjectChoice] = useState(false);
  const [projectOptions, setProjectOptions] = useState<AIProjectOption[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const skipPickerOnceRef = useRef(false);
  const onResponseRef = useRef(options.onResponse);
  onResponseRef.current = options.onResponse;

  const resetChat = useCallback(
    (projectId = initialProjectId, projectName = initialProjectName ?? null) => {
      abortRef.current?.abort();
      setConversationId(null);
      setMessages([]);
      setInput("");
      setPending(false);
      setError(null);
      setSources(null);
      setAction(null);
      setSelectedProjectId(projectId);
      setSelectedProjectName(projectName);
      setNeedsProjectChoice(false);
      setPendingQuestion(null);
      skipPickerOnceRef.current = false;
    },
    [initialProjectId, initialProjectName],
  );

  useEffect(() => {
    abortRef.current?.abort();
    setConversationId(null);
    setMessages([]);
    setInput("");
    setPending(false);
    setError(null);
    setSources(null);
    setAction(null);
    setSelectedProjectId(initialProjectId);
    setSelectedProjectName(initialProjectName ?? null);
    setNeedsProjectChoice(false);
    setPendingQuestion(null);
    skipPickerOnceRef.current = false;
    // Reset only when the route project changes, not when its name loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProjectId]);

  useEffect(() => {
    if (initialProjectName && selectedProjectId === initialProjectId) {
      setSelectedProjectName(initialProjectName);
    }
  }, [initialProjectId, initialProjectName, selectedProjectId]);

  const startNewChat = useCallback(() => {
    resetChat();
  }, [resetChat]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setPending(false);
  }, []);

  const loadProjectOptions = useCallback(async () => {
    setLoadingProjects(true);
    const result = await requestJson<{
      projects: AIProjectOption[];
    }>("/api/projects?page_size=50", { notify: false });

    if (result.ok) {
      setProjectOptions(
        result.data.projects.map((project) => ({
          id: project.id,
          name: project.name,
          location: project.location ?? null,
          status: project.status,
        })),
      );
    } else {
      setProjectOptions([]);
    }

    setLoadingProjects(false);
  }, []);

  const openProjectPicker = useCallback(
    async (question: string | null) => {
      setNeedsProjectChoice(true);
      setPendingQuestion(question);
      setError(null);
      await loadProjectOptions();
    },
    [loadProjectOptions],
  );

  const requestProjectSwitch = useCallback(() => {
    void openProjectPicker(null);
  }, [openProjectPicker]);

  const postMessage = useCallback(
    async (
      message: string,
      projectId: string | undefined,
      skipLocalUser: boolean,
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setPending(true);
      setError(null);
      setInput("");

      if (!skipLocalUser) {
        setMessages((current) => [...current, localUserMessage(message)]);
      }

      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId: conversationId ?? undefined,
            projectId: projectId ?? undefined,
            message,
          }),
          signal: controller.signal,
        });

        const payload = (await response.json().catch(() => null)) as
          | { ok: true; data: AIChatResponse }
          | { ok: false; message: string }
          | null;

        if (!payload || !payload.ok) {
          setError(
            payload && "message" in payload
              ? payload.message
              : "BuildPilot AI is temporarily unavailable. Please try again.",
          );
          return;
        }

        if (payload.data.needsProject) {
          setConversationId(payload.data.conversation.id);
          setProjectOptions(payload.data.projects ?? []);
          setPendingQuestion(message);
          setNeedsProjectChoice(true);
          return;
        }

        setConversationId(payload.data.conversation.id);
        setMessages((current) => {
          const withoutLocal = current.filter((item) => !item.id.startsWith("local-"));
          return [
            ...withoutLocal,
            {
              id: `user-${payload.data.message.id}`,
              role: "user",
              content: message,
              created_at: payload.data.message.created_at,
            },
            payload.data.message,
          ];
        });
        setAction(payload.data.action);
        setSources(sourceLine(payload.data.metadata.sources));
        if (payload.data.conversation.project_name) {
          setSelectedProjectName(payload.data.conversation.project_name);
        }
        if (payload.data.conversation.project_id) {
          setSelectedProjectId(payload.data.conversation.project_id);
        }
        onResponseRef.current?.();
      } catch (caught) {
        if (caught instanceof Error && caught.name === "AbortError") {
          return;
        }

        setError("BuildPilot AI is temporarily unavailable. Please try again.");
      } finally {
        setPending(false);
      }
    },
    [conversationId],
  );

  const sendMessage = useCallback(
    async (
      text: string,
      extras?: { projectId?: string; projectName?: string; skipLocalUser?: boolean },
    ) => {
      const message = text.trim();

      if (!message || pending) {
        return;
      }

      const chosenProjectId = extras?.projectId ?? selectedProjectId;
      const previousUser = lastUserContent(messages);
      let shouldPick =
        !extras?.projectId &&
        shouldAskForProject({
          message,
          previousUserMessage: previousUser,
          selectedProjectId: chosenProjectId,
        });

      if (
        shouldPick &&
        skipPickerOnceRef.current &&
        chosenProjectId &&
        !wantsProjectSwitch(message)
      ) {
        shouldPick = false;
        skipPickerOnceRef.current = false;
      }

      if (shouldPick) {
        const classified = classifyIntent(message, previousUser);
        const switchOnly =
          wantsProjectSwitch(message) && !classified.needsProject;
        setInput("");
        if (!switchOnly) {
          setMessages((current) => [...current, localUserMessage(message)]);
        }
        await openProjectPicker(switchOnly ? null : message);
        return;
      }

      if (extras?.projectName) {
        setSelectedProjectName(extras.projectName);
      }
      if (extras?.projectId) {
        setSelectedProjectId(extras.projectId);
      }

      setNeedsProjectChoice(false);
      setPendingQuestion(null);
      await postMessage(message, chosenProjectId, Boolean(extras?.skipLocalUser));
    },
    [
      messages,
      openProjectPicker,
      pending,
      postMessage,
      selectedProjectId,
    ],
  );

  const chooseProject = useCallback(
    async (project: AIProjectOption) => {
      if (pending) {
        return;
      }

      setSelectedProjectId(project.id);
      setSelectedProjectName(project.name);
      setNeedsProjectChoice(false);

      const question = pendingQuestion;
      setPendingQuestion(null);

      if (!question) {
        skipPickerOnceRef.current = true;
        setMessages((current) => [
          ...current,
          {
            id: `local-switch-${Date.now()}`,
            role: "assistant",
            content: `Now answering for ${project.name}. Ask a project question.`,
            created_at: new Date().toISOString(),
          },
        ]);
        return;
      }

      await sendMessage(question, {
        projectId: project.id,
        projectName: project.name,
        skipLocalUser: true,
      });
    },
    [pending, pendingQuestion, sendMessage],
  );

  const hydrateConversation = useCallback(
    (input: {
      conversationId: string;
      messages: AIChatMessage[];
      projectId?: string | null;
      projectName?: string | null;
    }) => {
      abortRef.current?.abort();
      setConversationId(input.conversationId);
      setMessages(input.messages);
      setAction(null);
      setError(null);
      setSources(null);
      setNeedsProjectChoice(false);
      setPendingQuestion(null);
      setSelectedProjectId(input.projectId ?? initialProjectId);
      setSelectedProjectName(input.projectName ?? initialProjectName ?? null);
      setPending(false);
      skipPickerOnceRef.current = false;
    },
    [initialProjectId, initialProjectName],
  );

  const loadSchemaError = useCallback(async () => {
    const query = initialProjectId ? `?projectId=${initialProjectId}` : "";
    const result = await requestJson<{ conversations: unknown[] }>(
      `/api/ai/conversations${query}`,
      { notify: false },
    );

    if (!result.ok && /schema|migration/i.test(result.message)) {
      setError(result.message);
    }
  }, [initialProjectId]);

  return {
    conversationId,
    messages,
    input,
    setInput,
    pending,
    error,
    sources,
    action,
    setAction,
    selectedProjectId,
    selectedProjectName,
    needsProjectChoice,
    projectOptions,
    loadingProjects,
    pendingQuestion,
    sendMessage,
    chooseProject,
    requestProjectSwitch,
    startNewChat,
    hydrateConversation,
    cancel,
    loadSchemaError,
  };
}
