"use client";

import { AIMarkdown } from "@/components/ai/ai-markdown";
import { AIProjectPicker } from "@/components/ai/ai-project-picker";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  GLOBAL_SUGGESTED_PROMPTS,
  PROJECT_SUGGESTED_PROMPTS,
} from "@/constants/ai";
import { useAIChat } from "@/hooks/use-ai-chat";
import { useDisclosure } from "@/hooks/use-disclosure";
import { requestJson } from "@/lib/api/client";
import { isProjectUuid } from "@/lib/projects/helpers";
import { cn } from "@/lib/utils";
import { Send, Square } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function projectIdFromPath(pathname: string): string | undefined {
  const match = pathname.match(
    /^\/projects\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  );
  const id = match?.[1];
  return id && isProjectUuid(id) ? id : undefined;
}

function isDedicatedAIPage(pathname: string): boolean {
  return pathname === "/ai" || /^\/projects\/[^/]+\/ai$/.test(pathname);
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 3v3M12 18v3M5 8h14v8H5z" />
      <path d="M9 12h.01M15 12h.01M8 8l-2-2M16 8l2-2" />
    </svg>
  );
}

export function AIFloatingChat() {
  const pathname = usePathname();
  const { isOpen, toggle, close } = useDisclosure();
  const projectId = projectIdFromPath(pathname);
  const [projectName, setProjectName] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const {
    messages,
    input,
    setInput,
    pending,
    error,
    sources,
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
    cancel,
    loadSchemaError,
  } = useAIChat({
    initialProjectId: projectId,
    initialProjectName: projectName ?? undefined,
  });

  const hidden = isDedicatedAIPage(pathname);
  const prompts = projectId ? PROJECT_SUGGESTED_PROMPTS : GLOBAL_SUGGESTED_PROMPTS;
  const fullPageHref = projectId ? `/projects/${projectId}/ai` : "/ai";

  useEffect(() => {
    if (!isOpen || !projectId) {
      setProjectName(null);
      return;
    }

    let cancelled = false;

    async function loadName() {
      const result = await requestJson<{ project: { name: string } }>(
        `/api/projects/${projectId}`,
        { notify: false },
      );

      if (!cancelled && result.ok) {
        setProjectName(result.data.project.name);
      }
    }

    void loadName();

    return () => {
      cancelled = true;
    };
  }, [isOpen, projectId]);

  useEffect(() => {
    if (isOpen) {
      void loadSchemaError();
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, loadSchemaError]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, pending, isOpen, needsProjectChoice]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, isOpen]);

  if (hidden) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {isOpen ? (
        <section
          role="dialog"
          aria-label="BuildPilot AI"
          aria-modal="false"
          className="pointer-events-auto flex h-[min(34rem,calc(100dvh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl"
        >
          <header className="flex items-start justify-between gap-3 border-b border-stone-100 bg-stone-950 px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="text-sm font-semibold">BuildPilot AI</p>
              <p className="mt-0.5 truncate text-xs text-stone-300">
                {selectedProjectName
                  ? `Project: ${selectedProjectName}`
                  : "Ask anything about your projects."}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={requestProjectSwitch}
                className="rounded-md px-2 py-1 text-xs text-stone-300 hover:bg-stone-800 hover:text-white"
              >
                Switch
              </button>
              <Link
                href={fullPageHref}
                className="rounded-md px-2 py-1 text-xs text-stone-300 hover:bg-stone-800 hover:text-white"
              >
                Expand
              </Link>
              <button
                type="button"
                onClick={startNewChat}
                className="rounded-md px-2 py-1 text-xs text-stone-300 hover:bg-stone-800 hover:text-white"
              >
                New
              </button>
              <button
                type="button"
                onClick={close}
                className="rounded-md px-2 py-1 text-xs text-stone-300 hover:bg-stone-800 hover:text-white"
                aria-label="Close chat"
              >
                Close
              </button>
            </div>
          </header>

          <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && !pending && !needsProjectChoice ? (
              <div className="px-1 py-2">
                <p className="text-sm font-medium text-stone-900">
                  Your AI construction co-pilot.
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  Answers use your BuildPilot project data.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {prompts.slice(0, 4).map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
                      className="rounded-full border border-stone-200 px-3 py-1.5 text-left text-xs text-stone-700 hover:border-amber-300 hover:text-amber-800"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[90%] rounded-2xl px-3 py-2",
                      message.role === "user"
                        ? "bg-amber-600 text-white"
                        : "border border-stone-200 bg-stone-50 text-stone-800",
                    )}
                  >
                    {message.role === "user" ? (
                      <p className="whitespace-pre-wrap text-sm leading-5">
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
                compact
                projects={projectOptions}
                loading={loadingProjects}
                currentProjectId={selectedProjectId}
                question={pendingQuestion}
                onSelect={(project) => void chooseProject(project)}
              />
            ) : null}

            {pending ? (
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <Spinner className="h-4 w-4" />
                BuildPilot AI is thinking...
              </div>
            ) : null}

            {sources && !pending && !needsProjectChoice ? (
              <p className="text-[11px] text-stone-500">Based on: {sources}</p>
            ) : null}
          </div>

          <div className="border-t border-stone-100 p-3">
            {error ? (
              <Alert variant="error" className="mb-2">
                {error}
              </Alert>
            ) : null}
            <form
              className="flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage(input);
              }}
            >
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about your projects..."
                className="min-h-12 flex-1 resize-none"
                disabled={pending}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage(input);
                  }
                }}
              />
              {pending ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={cancel}
                  icon={Square}
                >
                  Stop
                </Button>
              ) : (
                <Button type="submit" disabled={!input.trim()} icon={Send}>
                  Send
                </Button>
              )}
            </form>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={toggle}
        data-tour="ai-floating"
        className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-600 text-white shadow-lg transition hover:bg-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close BuildPilot AI" : "Open BuildPilot AI"}
      >
        {isOpen ? (
          <span className="text-2xl leading-none" aria-hidden>
            ×
          </span>
        ) : (
          <SparkleIcon className="h-6 w-6" />
        )}
      </button>
    </div>
  );
}
