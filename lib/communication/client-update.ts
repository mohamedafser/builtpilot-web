import type { ClientUpdateDraft } from "@/lib/ai/types";
import {
  buildClientUpdateMessage,
  buildDailyReportWhatsAppMessage,
  buildPortalInviteMessage,
  buildQuotationWhatsAppMessage,
} from "@/lib/whatsapp/messages";
import type { DailyReportDetail } from "@/lib/daily-reports/types";
import { MANPOWER_ROLE_LABELS } from "@/constants/daily-report";
import { formatCurrency } from "@/lib/utils";

export function buildReviewedClientUpdate(input: {
  clientName: string;
  projectName: string;
  draft: ClientUpdateDraft;
  portalUrl?: string | null;
  includeCost?: boolean;
  costSummary?: string | null;
}): string {
  const draft = { ...input.draft };

  // Never invent or attach cost unless explicitly allowed by Phase 9 settings.
  if (!input.includeCost) {
    if (draft.current_progress?.toLowerCase().includes("cost")) {
      draft.current_progress = draft.current_progress
        .split(/[.;]/)
        .filter((part) => !part.toLowerCase().includes("cost"))
        .join(".")
        .trim() || null;
    }
  } else if (input.costSummary) {
    draft.issues = draft.issues; // cost is not auto-appended; contractor controls content
  }

  return buildClientUpdateMessage({
    clientName: input.clientName,
    projectName: input.projectName,
    update: draft,
    portalUrl: input.portalUrl,
  });
}

export function buildDailyReportClientMessage(input: {
  clientName: string;
  projectName: string;
  detail: DailyReportDetail;
  portalUrl?: string | null;
  includeManpower?: boolean;
}): string {
  const manpowerSummary =
    input.includeManpower === false
      ? null
      : input.detail.manpower
          .filter((row) => row.worker_count > 0)
          .map((row) => {
            const label =
              MANPOWER_ROLE_LABELS[
                row.role as keyof typeof MANPOWER_ROLE_LABELS
              ] ?? row.role;
            return `${row.worker_count} ${label.toLowerCase()}`;
          })
          .join("\n") || null;

  return buildDailyReportWhatsAppMessage({
    clientName: input.clientName,
    projectName: input.projectName,
    reportDate: input.detail.report.report_date,
    workCompleted: input.detail.report.work_completed,
    issues: input.detail.report.issues,
    tomorrowPlan: input.detail.report.tomorrow_plan,
    manpowerSummary,
    portalUrl: input.portalUrl,
  });
}

export function buildPortalShareMessage(input: {
  clientName: string;
  projectName: string;
  portalUrl: string;
}): string {
  return buildPortalInviteMessage(input);
}

export function buildQuotationShareMessage(input: {
  clientName: string;
  quotationNumber: string;
  title: string;
  totalAmount: string | number;
  portalUrl?: string | null;
}): string {
  return buildQuotationWhatsAppMessage({
    clientName: input.clientName,
    quotationNumber: input.quotationNumber,
    title: input.title,
    totalAmountLabel: formatCurrency(input.totalAmount),
    portalUrl: input.portalUrl,
  });
}

/** Strip internal-only content patterns from contractor-edited messages. */
export function sanitizeOutboundClientMessage(content: string): string {
  return content
    .replace(/<[^>]*>/g, "")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "")
    .replace(/supabase\.co\/storage\/v1\/object\/sign\/[^\s]+/gi, "")
    .replace(/SUPABASE_SERVICE_ROLE_KEY|WHATSAPP_ACCESS_TOKEN/gi, "")
    .trim()
    .slice(0, 3500);
}
