"use client";

import { SendWhatsAppButton } from "@/components/communication/send-whatsapp-button";
import { buildQuotationShareMessage } from "@/lib/communication/client-update";
import { clientPortalUrlStorageKey } from "@/lib/client-portal/helpers";
import { requestJson } from "@/lib/api/client";
import type { QuotationDetail } from "@/lib/quotations/types";
import { isWhatsAppFeatureEnabled } from "@/lib/whatsapp/feature";
import { showToast } from "@/lib/toast";
import { useEffect, useState } from "react";

export function ShareQuotationWhatsAppButton({
  quotation,
}: {
  quotation: QuotationDetail;
}) {
  const projectId = quotation.project_id;
  const [toPhone, setToPhone] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isWhatsAppFeatureEnabled() || !projectId) {
      return;
    }

    void requestJson<{
      eligibility: { canSend: boolean; phone: string | null };
    }>(`/api/projects/${projectId}/communication`, { notify: false }).then(
      (result) => {
        if (!result.ok) {
          return;
        }
        setReady(result.data.eligibility.canSend);
        setToPhone(result.data.eligibility.phone);
      },
    );
  }, [projectId]);

  if (!isWhatsAppFeatureEnabled() || !projectId) {
    return null;
  }

  return (
    <SendWhatsAppButton
      projectId={projectId}
      label="Share Quotation"
      messageType="quotation"
      toPhone={toPhone}
      disabled={!ready}
      requireActivePortal={false}
      size="md"
      variant="secondary"
      buildMessage={() => {
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

        return buildQuotationShareMessage({
          clientName: quotation.client_name,
          quotationNumber: quotation.quotation_number,
          title: quotation.title,
          totalAmount: quotation.total_amount,
          portalUrl,
        });
      }}
    />
  );
}
