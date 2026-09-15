"use client";

import { AIMarkdown } from "@/components/ai/ai-markdown";
import { AIProjectPicker } from "@/components/ai/ai-project-picker";
import { ClientUpdatePreview } from "@/components/communication/client-update-preview";
import { Alert } from "@/components/ui/alert";
import { Button, linkButtonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { WithIcon } from "@/components/ui/with-icon";
import {
  GLOBAL_SUGGESTED_PROMPTS,
  PROJECT_SUGGESTED_PROMPTS,
} from "@/constants/ai";
import { useAIChat } from "@/hooks/use-ai-chat";
import { requestJson } from "@/lib/api/client";
import type {
  AIConversationSummary,
  ClientUpdateDraft,
  DailyReportDraft,
} from "@/lib/ai/types";
import { clientPortalUrlStorageKey } from "@/lib/client-portal/helpers";
import { isWhatsAppFeatureEnabled } from "@/lib/whatsapp/feature";
import { cn } from "@/lib/utils";
import {
  ArrowLeftRight,
  Bot,
  BriefcaseBusiness,
  CircleDashed,
  ExternalLink,
  FileText,
  MessageSquarePlus,
  MessagesSquare,
  PanelLeftClose,
  Package,
  Save,
  Send,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ChatScreenProps = {
  projectId?: string;
  projectName?: string;
  initialPrompt?: string;
};

const emptyManpower = {
  mason: "",
  helper: "",
  carpenter: "",
  electrician: "",
  plumber: "",
  other: "",
};

export function AIChatScreen({
  projectId,
  projectName,
  initialPrompt,
}: ChatScreenProps) {
  const [conversations, setConversations] = useState<AIConversationSummary[]>(
    [],
  );
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [showChats, setShowChats] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const autoSent = useRef(false);

  const loadConversations = useCallback(async () => {
    const query = projectId ? `?projectId=${projectId}` : "";
    const result = await requestJson<{
      conversations: AIConversationSummary[];
    }>(`/api/ai/conversations${query}`, { notify: false });

    if (result.ok) {
      setConversations(result.data.conversations);
      return;
    }

    if (/schema|migration/i.test(result.message)) {
      setSchemaError(result.message);
    }
  }, [projectId]);

  const {
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
    startNewChat: resetChat,
    hydrateConversation,
    cancel,
  } = useAIChat({
    initialProjectId: projectId,
    initialProjectName: projectName,
    onResponse: loadConversations,
  });

  const displayError = error ?? schemaError;
  const prompts = projectId
    ? PROJECT_SUGGESTED_PROMPTS
    : GLOBAL_SUGGESTED_PROMPTS;

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, pending, needsProjectChoice]);

  async function openConversation(id: string) {
    const result = await requestJson<{
      conversation: AIConversationSummary;
      messages: Array<{
        id: string;
        role: "user" | "assistant";
        content: string;
        created_at: string;
      }>;
    }>(`/api/ai/conversations/${id}`, { notify: false });

    if (!result.ok) {
      setSchemaError(result.message);
      return;
    }

    hydrateConversation({
      conversationId: id,
      messages: result.data.messages,
      projectId: result.data.conversation.project_id,
      projectName: result.data.conversation.project_name,
    });
    setShowChats(false);
  }

  function startNewChat() {
    resetChat();
    setShowChats(false);
  }

  useEffect(() => {
    if (!initialPrompt || autoSent.current) {
      return;
    }

    autoSent.current = true;
    void sendMessage(initialPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- send once from the URL prompt
  }, [initialPrompt]);

  async function saveDailyReport(
    draft: DailyReportDraft,
    targetProjectId: string,
  ) {
    const result = await requestJson<{ id: string }>(
      `/api/projects/${targetProjectId}/reports`,
      {
        method: "POST",
        body: JSON.stringify({
          report_date: draft.report_date,
          weather: "",
          work_completed: draft.work_completed,
          issues: draft.issues,
          tomorrow_plan: draft.tomorrow_plan,
          general_notes: draft.general_notes,
          manpower: emptyManpower,
          materials: [],
        }),
      },
    );

    if (result.ok) {
      setAction(null);
    }
  }

  async function removeConversation(id: string) {
    const result = await requestJson<{ id: string }>(
      `/api/ai/conversations/${id}`,
      {
        method: "DELETE",
      },
    );

    if (!result.ok) {
      return;
    }

    setConversations((current) => current.filter((item) => item.id !== id));
    if (conversationId === id) {
      startNewChat();
    }
  }

  async function saveRename(id: string) {
    const title = renameValue.trim();

    if (!title) {
      return;
    }

    const result = await requestJson<{ id: string; title: string }>(
      `/api/ai/conversations/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ title }),
      },
    );

    if (result.ok) {
      setConversations((current) =>
        current.map((item) => (item.id === id ? { ...item, title } : item)),
      );
      setRenameId(null);
    }
  }

  const headerSubtitle = useMemo(() => {
    if (selectedProjectName) {
      return `Project: ${selectedProjectName}`;
    }

    return "Ask a project question and choose which project to use.";
  }, [selectedProjectName]);

  const quickActions = [
    {
      title: "Project status",
      subtitle: "How is my project?",
      prompt: "How is my project doing?",
      icon: BriefcaseBusiness,
    },
    {
      title: "Materials",
      subtitle: "What needs to arrive?",
      prompt: "What materials are pending?",
      icon: Package,
    },
    {
      title: "Labour",
      subtitle: "Review labour planning",
      prompt: "How many workers are assigned?",
      icon: Users,
    },
    {
      title: "Cost analysis",
      subtitle: "Where is money going?",
      prompt: "How much have I spent so far?",
      icon: WalletCards,
    },
    {
      title: "Quotation",
      subtitle: "Review quotation",
      prompt: "Show me my quotation.",
      icon: FileText,
    },
    {
      title: "Next steps",
      subtitle: "What should I do next?",
      prompt: "What should I do next?",
      icon: BriefcaseBusiness,
    },
  ];

  return (
    <div className="h-[calc(100dvh-8.5rem)] bg-gradient-to-br from-stone-50 via-white to-amber-50/60 lg:h-[calc(100dvh-6.5rem)]">
      <div className="mx-auto flex h-full max-w-full flex-col p-3 sm:p-4 lg:p-5">
        <aside
          className={cn(
            "mb-4 w-full shrink-0 rounded-2xl border border-stone-200 bg-white/90 shadow-sm backdrop-blur-sm lg:hidden",
            showChats ? "block" : "hidden",
          )}
        >
          <div className="flex items-center justify-between border-b border-stone-100 p-4">
            <p className="text-sm font-semibold text-stone-900">Recent chats</p>
            <Button
              size="sm"
              variant="secondary"
              onClick={startNewChat}
              icon={MessageSquarePlus}
            >
              New chat
            </Button>
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <p className="px-3 py-6 text-sm text-stone-500">
                No saved chats yet. Ask a question to start one.
              </p>
            ) : (
              conversations.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-xl px-2 py-2",
                    conversationId === item.id
                      ? "bg-stone-100"
                      : "hover:bg-stone-50",
                  )}
                >
                  {renameId === item.id ? (
                    <form
                      className="space-y-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void saveRename(item.id);
                      }}
                    >
                      <input
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        className="h-9 w-full rounded-md border border-stone-300 px-2 text-sm"
                        maxLength={120}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" type="submit" icon={Save}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          type="button"
                          onClick={() => setRenameId(null)}
                          icon={X}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => void openConversation(item.id)}
                        className="block w-full truncate text-left text-sm font-medium text-stone-800"
                      >
                        {item.title}
                      </button>
                      {item.project_name ? (
                        <p className="truncate text-xs text-stone-500">
                          {item.project_name}
                        </p>
                      ) : null}
                      <div className="mt-1 flex gap-2">
                        <button
                          type="button"
                          className="text-xs text-stone-500 hover:text-stone-800"
                          onClick={() => {
                            setRenameId(item.id);
                            setRenameValue(item.title);
                          }}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:text-red-700"
                          onClick={() => void removeConversation(item.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <aside
            className={cn(
              "hidden w-full shrink-0 border-stone-200 bg-white/80 shadow-sm backdrop-blur-sm lg:block lg:w-72 lg:rounded-2xl lg:border",
              showChats ? "lg:block" : "lg:block",
            )}
          >
            <div className="flex items-center justify-between border-b border-stone-100 p-4">
              <p className="text-sm font-semibold text-stone-900">
                Recent chats
              </p>
              <Button
                size="sm"
                variant="secondary"
                onClick={startNewChat}
                icon={MessageSquarePlus}
              >
                New
              </Button>
            </div>
            <div className="max-h-[calc(100dvh-14rem)] space-y-1 overflow-y-auto p-2">
              {conversations.length === 0 ? (
                <p className="px-3 py-6 text-sm text-stone-500">
                  No saved chats yet. Ask a question to start one.
                </p>
              ) : (
                conversations.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-xl px-2 py-2",
                      conversationId === item.id
                        ? "bg-stone-100"
                        : "hover:bg-stone-50",
                    )}
                  >
                    {renameId === item.id ? (
                      <form
                        className="space-y-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void saveRename(item.id);
                        }}
                      >
                        <input
                          value={renameValue}
                          onChange={(event) =>
                            setRenameValue(event.target.value)
                          }
                          className="h-9 w-full rounded-md border border-stone-300 px-2 text-sm"
                          maxLength={120}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" type="submit" icon={Save}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            type="button"
                            onClick={() => setRenameId(null)}
                            icon={X}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => void openConversation(item.id)}
                          className="block w-full truncate text-left text-sm font-medium text-stone-800"
                        >
                          {item.title}
                        </button>
                        {item.project_name ? (
                          <p className="truncate text-xs text-stone-500">
                            {item.project_name}
                          </p>
                        ) : null}
                        <div className="mt-1 flex gap-2">
                          <button
                            type="button"
                            className="text-xs text-stone-500 hover:text-stone-800"
                            onClick={() => {
                              setRenameId(item.id);
                              setRenameValue(item.title);
                            }}
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            className="text-xs text-red-600 hover:text-red-700"
                            onClick={() => void removeConversation(item.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-1 flex-col lg:ml-4">
            <div className="mb-4 hidden rounded-2xl border border-stone-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm lg:flex">
              <div className="flex w-full flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-[0.2em] text-amber-700 uppercase">
                      BuildPilot Copilot
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold text-stone-900">
                      Your AI construction assistant
                    </h1>
                    <p className="mt-1 text-sm text-stone-500">
                      {headerSubtitle}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    <CircleDashed className="h-3.5 w-3.5" />
                    Ready
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-600">
                    <BriefcaseBusiness className="h-3.5 w-3.5" />
                    {selectedProjectName ?? "All Projects"}
                  </div>
                  <Button
                    variant="secondary"
                    className="lg:hidden"
                    onClick={() => setShowChats((value) => !value)}
                    icon={showChats ? PanelLeftClose : MessagesSquare}
                  >
                    {showChats ? "Hide chats" : "Chats"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={requestProjectSwitch}
                    icon={ArrowLeftRight}
                  >
                    Switch project
                  </Button>
                  <Button onClick={startNewChat} icon={MessageSquarePlus}>
                    New chat
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex h-full min-h-0 flex-1 flex-col rounded-2xl border border-stone-200 bg-white shadow-sm">
                <div
                  ref={listRef}
                  className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5"
                >
                  {messages.length === 0 && !pending && !needsProjectChoice ? (
                    <div className="space-y-5 py-4">
                      <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-stone-50 p-5 sm:p-6">
                        <p className="text-sm font-medium tracking-[0.2em] text-amber-700 uppercase">
                          ✨ BuildPilot Copilot
                        </p>
                        <h2 className="mt-3 text-3xl font-semibold text-stone-900">
                          How can I help with your project?
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm text-stone-600">
                          Ask about progress, materials, labour, quotations,
                          budget, pending actions, and what to focus on next.
                        </p>

                        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {quickActions.map(
                            ({ title, subtitle, prompt, icon: Icon }) => (
                              <button
                                key={title}
                                type="button"
                                onClick={() => void sendMessage(prompt)}
                                className="rounded-2xl border border-stone-200 bg-white p-3 text-left shadow-sm transition hover:border-amber-300 hover:shadow-md"
                              >
                                <div className="flex items-center gap-2 text-stone-800">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold">
                                      {title}
                                    </p>
                                  </div>
                                </div>
                                <p className="mt-3 text-sm text-stone-600">
                                  {subtitle}
                                </p>
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          message.role === "user"
                            ? "justify-end"
                            : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[92%] rounded-2xl px-4 py-3 sm:max-w-[80%]",
                            message.role === "user"
                              ? "bg-amber-600 text-white shadow-sm"
                              : "border border-stone-200 bg-stone-50 text-stone-800",
                          )}
                        >
                          {message.role === "user" ? (
                            <p className="text-sm leading-6 whitespace-pre-wrap">
                              {message.content}
                            </p>
                          ) : (
                            <AIMarkdown content={message.content} />
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {needsProjectChoice && !pending ? (
                    <AIProjectPicker
                      projects={projectOptions}
                      loading={loadingProjects}
                      currentProjectId={selectedProjectId}
                      question={pendingQuestion}
                      onSelect={(project) => void chooseProject(project)}
                    />
                  ) : null}

                  {pending ? (
                    <div className="flex items-center gap-2 text-sm text-stone-500">
                      <Spinner className="h-4 w-4" />
                      BuildPilot Copilot is thinking...
                    </div>
                  ) : null}

                  {sources && !pending && !needsProjectChoice ? (
                    <p className="text-xs text-stone-500">
                      Based on: {sources}
                    </p>
                  ) : null}

                  {action?.type === "daily_report_draft" ? (
                    <div className="rounded-xl border border-stone-200 bg-white p-4">
                      <p className="text-sm font-semibold text-stone-900">
                        Daily report draft
                      </p>
                      <p className="mt-1 text-sm text-stone-500">
                        Review this draft. It will not be saved until you
                        confirm.
                      </p>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <Button
                          onClick={() =>
                            void saveDailyReport(action.draft, action.projectId)
                          }
                          icon={FileText}
                        >
                          Save daily report
                        </Button>
                        <Link
                          href={`/projects/${action.projectId}/reports/new`}
                          className={linkButtonClassName("secondary")}
                        >
                          <WithIcon icon={ExternalLink}>
                            Open report form
                          </WithIcon>
                        </Link>
                      </div>
                    </div>
                  ) : null}

                  {action?.type === "client_update_draft" ? (
                    <ClientUpdateDraftActions
                      projectId={action.projectId}
                      draft={action.draft}
                    />
                  ) : null}
                </div>

                <div className="border-t border-stone-100 p-4">
                  {displayError ? (
                    <Alert variant="error" className="mb-3">
                      {displayError}
                    </Alert>
                  ) : null}

                  {messages.length > 0 ? (
                    <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                      {prompts.slice(0, 4).map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          disabled={pending}
                          onClick={() => void sendMessage(prompt)}
                          className="shrink-0 rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-600 hover:border-amber-300"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <form
                    className="flex flex-col gap-3 sm:flex-row sm:items-end"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void sendMessage(input);
                    }}
                  >
                    <Textarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder="Ask anything about your project..."
                      className="min-h-16 flex-1"
                      disabled={pending}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void sendMessage(input);
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      {pending ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={cancel}
                          icon={X}
                        >
                          Cancel
                        </Button>
                      ) : null}
                      <Button
                        type="submit"
                        disabled={pending || !input.trim()}
                        fullWidth
                        icon={Send}
                      >
                        {pending ? "Sending..." : "Send"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ClientUpdateDraftActions({
  projectId,
  draft,
}: {
  projectId: string;
  draft: ClientUpdateDraft;
}) {
  const [toPhone, setToPhone] = useState<string | null>(null);
  const [whatsappReady, setWhatsappReady] = useState(false);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);

  useEffect(() => {
    try {
      setPortalUrl(
        sessionStorage.getItem(clientPortalUrlStorageKey(projectId)),
      );
    } catch {
      setPortalUrl(null);
    }

    if (!isWhatsAppFeatureEnabled()) {
      return;
    }

    void requestJson<{
      eligibility: { canSend: boolean; phone: string | null };
    }>(`/api/projects/${projectId}/communication`, { notify: false }).then(
      (result) => {
        if (result.ok) {
          setWhatsappReady(result.data.eligibility.canSend);
          setToPhone(result.data.eligibility.phone);
        }
      },
    );
  }, [projectId]);

  return (
    <div className="space-y-3">
      <ClientUpdatePreview
        projectId={projectId}
        draft={draft}
        toPhone={toPhone}
        portalUrl={portalUrl}
        whatsappReady={whatsappReady}
      />
      <Link
        href={`/projects/${projectId}/client-portal`}
        className={linkButtonClassName("secondary")}
      >
        <WithIcon icon={ExternalLink}>Open client portal</WithIcon>
      </Link>
    </div>
  );
}
