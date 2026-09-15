"use client";

import { SendWhatsAppButton } from "@/components/communication/send-whatsapp-button";
import { requestJson } from "@/lib/api/client";
import { clientPortalUrlStorageKey } from "@/lib/client-portal/helpers";
import { buildDailyReportClientMessage } from "@/lib/communication/client-update";
import type { DailyReportDetail } from "@/lib/daily-reports/types";
import { isWhatsAppFeatureEnabled } from "@/lib/whatsapp/feature";
import { showToast } from "@/lib/toast";
import { useEffect, useState } from "react";

export function ShareDailyReportUpdateButton({
  projectId,
  detail,
}: {
  projectId: string;
  detail: DailyReportDetail;
}) {
  const [toPhone, setToPhone] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [clientName, setClientName] = useState("there");
  const [projectName, setProjectName] = useState("your project");

  useEffect(() => {
    if (!isWhatsAppFeatureEnabled()) {
      return;
    }

    void requestJson<{
      project_name: string;
      access: { client_name: string } | null;
      eligibility: { canSend: boolean; phone: string | null };
    }>(`/api/projects/${projectId}/communication`, { notify: false }).then(
      (result) => {
        if (!result.ok) {
          return;
        }
        setReady(result.data.eligibility.canSend);
        setToPhone(result.data.eligibility.phone);
        setProjectName(result.data.project_name);
        if (result.data.access?.client_name) {
          setClientName(result.data.access.client_name);
        }
      },
    );
  }, [projectId]);

  if (!isWhatsAppFeatureEnabled()) {
    return null;
  }

  return (
    <SendWhatsAppButton
      projectId={projectId}
      label="Share Update"
      messageType="daily_report"
      toPhone={toPhone}
      disabled={!ready}
      requireActivePortal
      buildMessage={async () => {
        if (!ready) {
          showToast("WhatsApp updates are not enabled for this client.", "error");
          throw new Error("not ready");
        }

        let portalUrl: string | null = null;
        try {
          portalUrl = sessionStorage.getItem(
            clientPortalUrlStorageKey(projectId),
          );
        } catch {
          portalUrl = null;
        }

        const preview = await requestJson<{ message: string }>(
          `/api/projects/${projectId}/reports/${detail.report.id}/share-preview`,
          { method: "POST", notify: false },
        );

        if (preview.ok) {
          if (portalUrl && !preview.data.message.includes(portalUrl)) {
            return `${preview.data.message}\n\nView project:\n${portalUrl}`;
          }
          return preview.data.message;
        }

        return buildDailyReportClientMessage({
          clientName,
          projectName,
          detail,
          portalUrl,
          includeManpower: true,
        });
      }}
    />
  );
}
