"use client";

import { WhatsAppMessagePreview } from "@/components/communication/whatsapp-message-preview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ClientUpdateDraft } from "@/lib/ai/types";
import { requestJson } from "@/lib/api/client";
import { isWhatsAppFeatureEnabled } from "@/lib/whatsapp/feature";
import { showToast } from "@/lib/toast";
import { Copy, MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";

type ClientUpdatePreviewProps = {
  projectId: string;
  draft: ClientUpdateDraft;
  toPhone: string | null;
  portalUrl?: string | null;
  whatsappReady: boolean;
};

export function ClientUpdatePreview({
  projectId,
  draft,
  toPhone,
  portalUrl,
  whatsappReady,
}: ClientUpdatePreviewProps) {
  const whatsappEnabled = isWhatsAppFeatureEnabled();
  const [edited, setEdited] = useState(() => formatEditable(draft));
  const [previewOpen, setPreviewOpen] = useState(false);
  const [outbound, setOutbound] = useState("");
  const [building, setBuilding] = useState(false);

  const parsedDraft = useMemo(() => parseEditable(edited, draft), [edited, draft]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(edited);
      showToast("Client update copied.", "success");
    } catch {
      showToast("Unable to copy the update.", "error");
    }
  }

  async function prepareWhatsApp() {
    if (!whatsappReady) {
      showToast("WhatsApp updates are not enabled for this client.", "error");
      return;
    }

    setBuilding(true);
    const result = await requestJson<{ message: string }>(
      `/api/projects/${projectId}/client-update/preview`,
      {
        method: "POST",
        body: JSON.stringify({
          ...parsedDraft,
          portalUrl: portalUrl ?? null,
        }),
        notify: false,
      },
    );
    setBuilding(false);

    if (!result.ok) {
      showToast(result.message, "error");
      return;
    }

    setOutbound(result.data.message);
    setPreviewOpen(true);
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-sm font-semibold text-stone-900">Client update draft</p>
      <p className="mt-1 text-sm text-stone-500">
        Review and edit before sharing. Nothing is sent automatically.
      </p>
      <Textarea
        className="mt-3 min-h-40"
        value={edited}
        onChange={(event) => setEdited(event.target.value)}
      />
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          variant="secondary"
          onClick={() => void copy()}
          size="lg"
          icon={Copy}
        >
          Copy
        </Button>
        {whatsappEnabled ? (
          <Button
            onClick={() => void prepareWhatsApp()}
            disabled={building}
            size="lg"
            icon={MessageCircle}
          >
            {building ? "Preparing..." : "Send via WhatsApp"}
          </Button>
        ) : null}
      </div>
      {whatsappEnabled ? (
        <WhatsAppMessagePreview
          open={previewOpen}
          toPhone={toPhone}
          initialMessage={outbound}
          messageType="client_update"
          projectId={projectId}
          requireActivePortal
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </div>
  );
}

function formatEditable(draft: ClientUpdateDraft): string {
  return [
    draft.title,
    "",
    "This week's progress:",
    ...draft.this_week.map((item) => `- ${item}`),
    "",
    draft.current_progress ? `Current progress: ${draft.current_progress}` : "",
    "",
    "Upcoming:",
    ...draft.upcoming.map((item) => `- ${item}`),
    "",
    "Issues:",
    ...draft.issues.map((item) => `- ${item}`),
    "",
    draft.closing,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function parseEditable(
  text: string,
  fallback: ClientUpdateDraft,
): ClientUpdateDraft {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const bullets = lines
    .filter((line) => line.startsWith("- ") || line.startsWith("• "))
    .map((line) => line.replace(/^[-•]\s*/, ""));

  const progressLine = lines.find((line) =>
    line.toLowerCase().startsWith("current progress:"),
  );

  return {
    title: lines[0] || fallback.title,
    this_week: bullets.slice(0, 6).length ? bullets.slice(0, 6) : fallback.this_week,
    current_progress: progressLine
      ? progressLine.replace(/^current progress:\s*/i, "")
      : fallback.current_progress,
    upcoming: bullets.slice(6, 10).length ? bullets.slice(6, 10) : fallback.upcoming,
    issues: bullets.slice(10, 14).length ? bullets.slice(10, 14) : fallback.issues,
    closing: fallback.closing,
  };
}
