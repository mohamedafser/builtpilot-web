import type { AIIntent, AIPeriod, ClassifiedIntent } from "@/lib/ai/types";
import {
  shiftIsoDate,
  startOfMonthIso,
  startOfPreviousMonthIso,
  startOfWeekIso,
  endOfMonthIso,
  todayIsoDate,
} from "@/lib/labour/money";

const STOP_WORDS = new Set([
  "how",
  "much",
  "many",
  "what",
  "which",
  "when",
  "where",
  "who",
  "the",
  "this",
  "that",
  "these",
  "those",
  "a",
  "an",
  "of",
  "on",
  "in",
  "for",
  "to",
  "and",
  "or",
  "my",
  "our",
  "we",
  "was",
  "were",
  "is",
  "are",
  "did",
  "does",
  "do",
  "show",
  "give",
  "me",
  "please",
  "project",
  "site",
]);

const TRADE_TERMS = [
  "brickwork",
  "brick",
  "plastering",
  "plaster",
  "concrete",
  "cement",
  "flooring",
  "painting",
  "electrical",
  "plumbing",
  "shuttering",
  "formwork",
  "excavation",
  "steel",
  "reinforcement",
  "tiling",
  "tiles",
  "waterproofing",
  "masonry",
  "sand",
  "aggregate",
];

function includesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function periodFromMessage(message: string, now = new Date()): AIPeriod {
  const today = todayIsoDate(now);
  const lower = message.toLowerCase();

  if (/\byesterday\b/.test(lower)) {
    const yesterday = shiftIsoDate(today, -1);
    return { from: yesterday, to: yesterday, label: "yesterday" };
  }

  if (/\btoday\b/.test(lower)) {
    return { from: today, to: today, label: "today" };
  }

  if (/\blast month\b/.test(lower)) {
    const start = startOfPreviousMonthIso(today);
    return { from: start, to: endOfMonthIso(start), label: "last month" };
  }

  if (/\bthis month\b|\bthis month's\b|\bin september\b/.test(lower)) {
    return {
      from: startOfMonthIso(today),
      to: today,
      label: "this month",
    };
  }

  if (/\blast 7 days\b|\bpast week\b|\bthis week\b/.test(lower)) {
    return {
      from: startOfWeekIso(today),
      to: today,
      label: "this week",
    };
  }

  return {
    from: startOfWeekIso(today),
    to: today,
    label: "this week",
  };
}

function defaultPeriodForIntent(intent: AIIntent, now = new Date()): AIPeriod {
  const today = todayIsoDate(now);

  if (
    intent === "LABOUR_SUMMARY" ||
    intent === "EXPENSE_SUMMARY" ||
    intent === "MATERIAL_SUMMARY"
  ) {
    return {
      from: startOfMonthIso(today),
      to: today,
      label: "this month",
    };
  }

  if (
    intent === "BOQ_PROGRESS" ||
    intent === "BOQ_REMAINING" ||
    intent === "PROJECT_SUMMARY" ||
    intent === "ESTIMATE_VS_ACTUAL" ||
    intent === "QUOTATION" ||
    intent === "MATERIAL_STOCK" ||
    intent === "PROJECT_COST"
  ) {
    return { from: today, to: today, label: "current" };
  }

  return {
    from: startOfWeekIso(today),
    to: today,
    label: "this week",
  };
}

function extractWorkQuery(message: string): string | undefined {
  const lower = message.toLowerCase();
  const trade = TRADE_TERMS.find((term) => lower.includes(term));

  if (trade) {
    return trade;
  }

  const words = lower
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));

  return words[0];
}

const GENERIC_PROJECT_QUERY =
  /^(this|that|the|my|our|current|a|an|another|different|other|remaining|labour|labor|materials?|progress|cost|work|boq|site|reports?)\b/i;

function extractProjectQuery(message: string): string | undefined {
  const named = message.match(
    /(?:for|on)\s+(?:the\s+)?(?:project\s+)?([A-Za-z0-9][A-Za-z0-9 .,'-]{2,80})|(?:project)\s+([A-Za-z0-9][A-Za-z0-9 .,'-]{2,80})/i,
  );
  const value = (named?.[1] ?? named?.[2])?.replace(/[?.!]+$/, "").trim();

  if (!value || GENERIC_PROJECT_QUERY.test(value)) {
    return undefined;
  }

  return value;
}

export function wantsProjectSwitch(message: string): boolean {
  return /(?:switch|change)\s+(?:to\s+)?(?:(?:the|a)\s+)?project|(?:another|different|other)\s+project|(?:choose|pick|select)\s+(?:a\s+)?project/i.test(
    message,
  );
}

export function shouldAskForProject(input: {
  message: string;
  previousUserMessage?: string;
  selectedProjectId?: string | null;
}): boolean {
  const classified = classifyIntent(input.message, input.previousUserMessage);
  const named = Boolean(classified.projectQuery);
  const switchRequested = wantsProjectSwitch(input.message);

  if (named) {
    return false;
  }

  if (switchRequested) {
    return true;
  }

  if (!classified.needsProject) {
    return false;
  }

  if (classified.isFollowUp && input.selectedProjectId) {
    return false;
  }

  return true;
}

function classifyPrimary(message: string): AIIntent {
  const text = message.toLowerCase();
  if (
    includesAny(text, [
      /create (a )?daily (site )?report/,
      /draft (a )?daily report/,
      /turn this into (a )?daily report/,
      /from today'?s information/,
    ])
  ) {
    return "DAILY_REPORT_GENERATION";
  }

  if (
    includesAny(text, [
      /client[- ]friendly/,
      /client update/,
      /update for (the )?client/,
      /create (a )?client update/,
    ])
  ) {
    return "CLIENT_UPDATE";
  }

  if (
    includesAny(text, [
      /estimate vs actual/,
      /compared? to the estimate/,
      /quotation vs actual/,
      /over the estimate/,
      /spending more than estimated/,
      /budget has been used/,
    ])
  ) {
    return "ESTIMATE_VS_ACTUAL";
  }

  if (
    includesAny(text, [
      /\bquotation\b/,
      /\bquote\b/,
      /accepted quotation/,
    ])
  ) {
    return "QUOTATION";
  }

  if (
    includesAny(text, [
      /over budget/,
      /project cost/,
      /has (this|the) project cost/,
      /actual cost/,
      /how much has (this|the) project cost/,
      /compare project costs/,
    ])
  ) {
    return "PROJECT_COST";
  }

  if (
    includesAny(text, [
      /low in stock/,
      /low stock/,
      /out of stock/,
      /current stock/,
    ])
  ) {
    return "MATERIAL_STOCK";
  }

  if (
    includesAny(text, [
      /\bmaterials?\b/,
      /cement/,
      /received this week/,
      /material consumption/,
      /materials were used/,
    ])
  ) {
    return "MATERIAL_SUMMARY";
  }

  if (
    includesAny(text, [
      /\blabour\b/,
      /\blabor\b/,
      /workers? (on site|were)/,
      /labour days/,
      /highest worker count/,
    ])
  ) {
    return "LABOUR_SUMMARY";
  }

  if (
    includesAny(text, [
      /\bexpenses?\b/,
      /biggest expenses/,
      /how much did we spend/,
      /expense categories/,
    ])
  ) {
    return "EXPENSE_SUMMARY";
  }

  if (
    includesAny(text, [
      /measured/,
      /measurements?/,
      /where was the .+ completed/,
    ])
  ) {
    return "MEASUREMENTS";
  }

  if (
    includesAny(text, [
      /still incomplete/,
      /items are incomplete/,
      /what remains/,
      /remaining work/,
      /how much .+ remains/,
      /work remains/,
    ])
  ) {
    return "BOQ_REMAINING";
  }

  if (
    includesAny(text, [
      /\bboq\b/,
      /bill of quantities/,
      /brickwork/,
      /plastering/,
      /progress/,
      /how much .+ (is )?complet/,
      /percentage .+ complete/,
    ])
  ) {
    return "BOQ_PROGRESS";
  }

  if (
    includesAny(text, [
      /issues?/,
      /delay/,
      /latest site issues/,
      /problems? (on site|reported)/,
    ])
  ) {
    return "SITE_ISSUES";
  }

  if (
    includesAny(text, [
      /site report/,
      /happened (on site|this week)/,
      /planned for tomorrow/,
      /weekly (site )?progress/,
      /what work was completed/,
      /what was completed/,
    ])
  ) {
    return "SITE_REPORT";
  }

  if (
    includesAny(text, [
      /active projects/,
      /which projects/,
      /currently active/,
      /all projects/,
      /summary of all/,
      /needs attention/,
    ])
  ) {
    return "PROJECT_LIST";
  }

  if (
    includesAny(text, [
      /summarize (this|the) project/,
      /project overview/,
      /summarize this/,
    ])
  ) {
    return "PROJECT_SUMMARY";
  }

  if (
    includesAny(text, [
      /what is the difference/,
      /what does (a )?.+ mean/,
      /explain /,
      /generally/,
      /m20/,
      /m25/,
      /how much sand is generally/,
    ])
  ) {
    return "GENERAL_CONSTRUCTION";
  }

  return "UNKNOWN";
}

function isShortFollowUp(message: string): boolean {
  const trimmed = message.trim();

  if (trimmed.length <= 40) {
    return /^(and |what about|how about|the remaining|remaining|this month|last month|yesterday|today|by section|for labour|for materials)/i.test(
      trimmed,
    );
  }

  return false;
}

const PROJECT_REQUIRED: Record<AIIntent, boolean> = {
  PROJECT_SUMMARY: true,
  SITE_REPORT: true,
  SITE_ISSUES: true,
  BOQ_PROGRESS: true,
  BOQ_REMAINING: true,
  MEASUREMENTS: true,
  LABOUR_SUMMARY: true,
  MATERIAL_SUMMARY: true,
  MATERIAL_STOCK: true,
  EXPENSE_SUMMARY: true,
  PROJECT_COST: true,
  QUOTATION: true,
  ESTIMATE_VS_ACTUAL: true,
  PROJECT_LIST: false,
  CLIENT_UPDATE: true,
  DAILY_REPORT_GENERATION: true,
  GENERAL_CONSTRUCTION: false,
  UNKNOWN: false,
};

export function classifyIntent(
  message: string,
  previousUserMessage?: string,
  now = new Date(),
): ClassifiedIntent {
  const current = classifyPrimary(message);
  const followUp = isShortFollowUp(message);
  let intent = current;

  if ((intent === "UNKNOWN" || followUp) && previousUserMessage) {
    const previous = classifyPrimary(`${previousUserMessage} ${message}`);
    if (previous !== "UNKNOWN") {
      intent = previous;
    } else if (followUp) {
      intent = classifyPrimary(previousUserMessage);
    }
  }

  const mentionedPeriod = /\b(today|yesterday|this week|this month|last month|last 7 days|past week)\b/i.test(
    message,
  );
  const period = mentionedPeriod
    ? periodFromMessage(message, now)
    : defaultPeriodForIntent(intent, now);

  return {
    intent,
    period,
    workQuery: extractWorkQuery(message),
    projectQuery: extractProjectQuery(message),
    needsProject: PROJECT_REQUIRED[intent],
    isGlobal: intent === "PROJECT_LIST" || !PROJECT_REQUIRED[intent],
    isFollowUp: followUp,
  };
}
