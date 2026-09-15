"use client";

import { SendWhatsAppButton } from "@/components/communication/send-whatsapp-button";
import { WhatsAppMessageHistory } from "@/components/communication/whatsapp-message-history";
import { WhatsAppSettings } from "@/components/communication/whatsapp-settings";
import { Button, linkButtonClassName } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WithIcon } from "@/components/ui/with-icon";
import { requestJson } from "@/lib/api/client";
import {
  buildClientPortalShareUrl,
  clientPortalUrlStorageKey,
} from "@/lib/client-portal/helpers";
import { buildPortalShareMessage } from "@/lib/communication/client-update";
import type { WhatsAppEligibility, WhatsAppMessageRecord } from "@/lib/whatsapp/types";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Copy, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CommunicationCenterProps = {
  projectId: string;
  projectName: string;
  access: {
    id: string;
    client_name: string;
    client_phone: string | null;
    whatsapp_enabled: boolean;
    whatsapp_phone: string | null;
    whatsapp_opted_in: boolean;
    portal_active: boolean;
  } | null;
  eligibility: WhatsAppEligibility;
  recentMessages: WhatsAppMessageRecord[];
};

export function CommunicationCenter({
  projectId,
  projectName,
  access,
  eligibility,
  recentMessages,
}: CommunicationCenterProps) {
  const router = useRouter();
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const storageKey = clientPortalUrlStorageKey(projectId);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        setPortalUrl(stored);
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  if (!access) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project communication</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-600">
            Enable the client portal to configure WhatsApp updates and share
            project progress.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Project communication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-stone-600">
            Client:{" "}
            <span className="font-medium text-stone-900">
              {access.client_name}
            </span>
          </p>
          <p className="text-sm text-stone-600">
            WhatsApp:{" "}
            <span className="font-medium text-stone-900">
              {eligibility.whatsappEnabled && eligibility.optedIn
                ? "Enabled"
                : "Not enabled"}
            </span>
          </p>
          <p className="text-sm text-stone-600">
            Portal:{" "}
            <span className="font-medium text-stone-900">
              {access.portal_active ? "Active" : "Inactive"}
            </span>
          </p>
          {!eligibility.canSend && eligibility.reason ? (
            <p className="text-sm text-amber-800">{eligibility.reason}</p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <SendWhatsAppButton
              projectId={projectId}
              label="Share Portal"
              messageType="portal_link"
              toPhone={eligibility.phone}
              disabled={!access.portal_active || !eligibility.canSend}
              requireActivePortal
              buildMessage={() => {
                if (!portalUrl) {
                  showToast(
                    "Copy or regenerate the portal link first so it can be shared.",
                    "error",
                  );
                  throw new Error("missing portal url");
                }
                return buildPortalShareMessage({
                  clientName: access.client_name,
                  projectName,
                  portalUrl,
                });
              }}
              onSent={() => router.refresh()}
            />
            <Link
              href={`/projects/${projectId}/ai?prompt=${encodeURIComponent("Generate a client update for this project")}`}
              className={cn(linkButtonClassName("secondary", "lg"))}
            >
              <WithIcon icon={Sparkles}>Generate AI Update</WithIcon>
            </Link>
            <Button
              variant="secondary"
              size="lg"
              icon={Copy}
              onClick={async () => {
                const result = await requestJson<{
                  message: string;
                }>(`/api/projects/${projectId}/client-update/preview`, {
                  method: "POST",
                  body: JSON.stringify({
                    title: "Project Update",
                    this_week: [],
                    current_progress: null,
                    upcoming: [],
                    issues: [],
                    closing: "",
                    portalUrl,
                  }),
                  notify: false,
                });
                if (!result.ok) {
                  showToast(result.message, "error");
                  return;
                }
                try {
                  await navigator.clipboard.writeText(result.data.message);
                  showToast("Client update copied.", "success");
                } catch {
                  showToast("Unable to copy update.", "error");
                }
              }}
            >
              Copy Update Template
            </Button>
          </div>
        </CardContent>
      </Card>

      <WhatsAppSettings
        projectId={projectId}
        clientName={access.client_name}
        clientPhone={access.client_phone}
        whatsappPhone={access.whatsapp_phone}
        whatsappEnabled={access.whatsapp_enabled}
        whatsappOptedIn={access.whatsapp_opted_in}
      />

      <WhatsAppMessageHistory messages={recentMessages} />
    </div>
  );
}

// Keep helper available for callers that regenerate URLs in the same session.
export function rememberPortalUrlForShare(projectId: string, token: string) {
  const url = buildClientPortalShareUrl(
    typeof window !== "undefined" ? window.location.origin : "",
    token,
  );
  try {
    sessionStorage.setItem(clientPortalUrlStorageKey(projectId), url);
  } catch {
    // ignore
  }
  return url;
}
