export const AI_INTENTS = [
  "PROJECT_SUMMARY",
  "SITE_REPORT",
  "SITE_ISSUES",
  "BOQ_PROGRESS",
  "BOQ_REMAINING",
  "MEASUREMENTS",
  "LABOUR_SUMMARY",
  "MATERIAL_SUMMARY",
  "MATERIAL_STOCK",
  "EXPENSE_SUMMARY",
  "PROJECT_COST",
  "QUOTATION",
  "ESTIMATE_VS_ACTUAL",
  "PROJECT_LIST",
  "CLIENT_UPDATE",
  "DAILY_REPORT_GENERATION",
  "GENERAL_CONSTRUCTION",
  "UNKNOWN",
] as const;

export type AIIntentName = (typeof AI_INTENTS)[number];

export const GLOBAL_SUGGESTED_PROMPTS = [
  "Summarize my active projects",
  "Which project needs attention?",
  "Show recent site issues",
  "Compare project costs",
  "Which BOQ items are incomplete?",
] as const;

export const PROJECT_SUGGESTED_PROMPTS = [
  "Summarize this project",
  "What was completed this week?",
  "What work remains?",
  "How much labour did we spend?",
  "What materials were used?",
  "Show BOQ progress",
  "Create a client update",
] as const;

export const MAX_CHAT_MESSAGE_LENGTH = 4000;
export const MAX_CONVERSATION_TITLE_LENGTH = 120;
export const MAX_HISTORY_MESSAGES = 8;
export const MAX_AI_OUTPUT_TOKENS = 1200;
export const MAX_AI_STRUCTURED_TOKENS = 800;
export const AI_CHAT_RATE_LIMIT_PER_MINUTE = 20;
export const AI_CHAT_RATE_LIMIT_PER_HOUR = 80;
