import type { ClientUpdateDraft } from "@/lib/ai/types";
import { formatDate } from "@/lib/utils";

function cleanLines(items: string[], limit = 8): string[] {
  return items
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, limit)
    .map((item) => item.slice(0, 200));
}

function bullets(items: string[]): string {
  if (!items.length) {
    return "• None recorded";
  }

  return items.map((item) => `• ${item}`).join("\n");
}

function sanitizeMessageBody(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 3500);
}

function assertSafePortalUrl(portalUrl: string | null | undefined): string | null {
  if (!portalUrl) {
    return null;
  }

  try {
    const url = new URL(portalUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }
    if (!url.pathname.startsWith("/client/project/")) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function buildPortalInviteMessage(input: {
  clientName: string;
  projectName: string;
  portalUrl: string;
}): string {
  const safeUrl = assertSafePortalUrl(input.portalUrl);
  const client = input.clientName.trim() || "there";
  const project = input.projectName.trim() || "your project";

  const body = [
    `Hi ${client},`,
    "",
    "Your project update is available on BuildPilot.",
    "",
    `Project:`,
    project,
    "",
    "You can view the latest progress, site updates and photos here:",
    safeUrl ?? "",
    "",
    "Thanks.",
    "",
    "— BuildPilot",
  ]
    .filter((line, index, arr) => !(line === "" && arr[index - 1] === ""))
    .join("\n");

  return sanitizeMessageBody(body);
}

export function buildClientUpdateMessage(input: {
  clientName: string;
  projectName: string;
  update: ClientUpdateDraft | {
    title?: string;
    this_week: string[];
    current_progress: string | null;
    upcoming: string[];
    issues: string[];
  };
  portalUrl?: string | null;
}): string {
  const client = input.clientName.trim() || "there";
  const project = input.projectName.trim() || "your project";
  const week = cleanLines(input.update.this_week);
  const upcoming = cleanLines(input.update.upcoming);
  const issues = cleanLines(input.update.issues);
  const progress = input.update.current_progress?.trim() || null;
  const safeUrl = assertSafePortalUrl(input.portalUrl ?? null);

  const parts = [
    `Hi ${client},`,
    "",
    `Here is your latest update for ${project}.`,
    "",
  ];

  if (progress) {
    parts.push("Progress:", progress, "");
  }

  parts.push("Completed this week:", bullets(week), "");
  parts.push("Next:", bullets(upcoming), "");

  if (issues.length) {
    parts.push("Issues:", bullets(issues), "");
  }

  if (safeUrl) {
    parts.push("View full project details:", safeUrl, "");
  }

  parts.push("— BuildPilot");

  return sanitizeMessageBody(parts.join("\n"));
}

export function buildDailyReportWhatsAppMessage(input: {
  clientName: string;
  projectName: string;
  reportDate: string;
  workCompleted: string;
  issues: string | null;
  tomorrowPlan: string | null;
  manpowerSummary?: string | null;
  portalUrl?: string | null;
}): string {
  const client = input.clientName.trim() || "there";
  const completed = cleanLines(
    input.workCompleted
      .split(/\n|•|-/)
      .map((part) => part.trim())
      .filter(Boolean),
  );
  const issues = input.issues
    ? cleanLines(
        input.issues
          .split(/\n|•|-/)
          .map((part) => part.trim())
          .filter(Boolean),
      )
    : [];
  const tomorrow = input.tomorrowPlan?.trim() || null;
  const safeUrl = assertSafePortalUrl(input.portalUrl ?? null);
  const dateLabel = formatDate(input.reportDate);

  const parts = [
    `Hi ${client},`,
    "",
    `Site Update — ${dateLabel}`,
    "",
    "Completed:",
    bullets(completed.length ? completed : ["Work progress was recorded."]),
    "",
  ];

  if (input.manpowerSummary?.trim()) {
    parts.push("Manpower:", input.manpowerSummary.trim(), "");
  }

  if (issues.length) {
    parts.push("Issues:", bullets(issues), "");
  }

  if (tomorrow) {
    parts.push("Tomorrow:", tomorrow.slice(0, 300), "");
  }

  if (safeUrl) {
    parts.push("View project:", safeUrl, "");
  }

  parts.push("— BuildPilot");

  return sanitizeMessageBody(parts.join("\n"));
}

export function buildQuotationWhatsAppMessage(input: {
  clientName: string;
  quotationNumber: string;
  title: string;
  totalAmountLabel: string;
  portalUrl?: string | null;
  viewUrl?: string | null;
}): string {
  const client = input.clientName.trim() || "there";
  const safePortal = assertSafePortalUrl(input.portalUrl ?? null);
  const link = safePortal ?? input.viewUrl ?? null;

  const parts = [
    `Hi ${client},`,
    "",
    `Please find quotation ${input.quotationNumber}.`,
    "",
    input.title.trim(),
    `Total: ${input.totalAmountLabel}`,
    "",
  ];

  if (link) {
    parts.push("View details:", link, "");
  }

  parts.push("— BuildPilot");

  return sanitizeMessageBody(parts.join("\n"));
}

export function draftFromPlainClientUpdate(text: string): {
  this_week: string[];
  current_progress: string | null;
  upcoming: string[];
  issues: string[];
} {
  const lines = text
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);

  return {
    this_week: lines.slice(0, 5),
    current_progress: null,
    upcoming: [],
    issues: [],
  };
}
