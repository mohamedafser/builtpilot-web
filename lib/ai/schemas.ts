import { z } from "zod";
import {
  AI_INTENTS,
  MAX_CHAT_MESSAGE_LENGTH,
  MAX_CONVERSATION_TITLE_LENGTH,
} from "@/constants/ai";
import { isUuid } from "@/lib/projects/helpers";

export const uuidSchema = z
  .string()
  .trim()
  .refine((value) => isUuid(value), "Enter a valid id.");

export const chatRequestSchema = z.object({
  conversationId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  message: z
    .string()
    .trim()
    .min(1, "Enter a question about your projects.")
    .max(MAX_CHAT_MESSAGE_LENGTH, "That question is too long."),
});

export const conversationCreateSchema = z.object({
  projectId: uuidSchema.optional().nullable(),
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(MAX_CONVERSATION_TITLE_LENGTH, "Title is too long.")
    .optional(),
});

export const conversationUpdateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(MAX_CONVERSATION_TITLE_LENGTH, "Title is too long."),
});

export const dailyReportDraftSchema = z.object({
  report_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
  work_completed: z
    .string()
    .trim()
    .min(1, "Work completed is required.")
    .max(10000, "Work completed is too long."),
  issues: z.string().trim().max(10000).default(""),
  tomorrow_plan: z.string().trim().max(10000).default(""),
  general_notes: z.string().trim().max(10000).default(""),
});

export const clientUpdateDraftSchema = z.object({
  title: z.string().trim().min(1).max(160),
  this_week: z.array(z.string().trim().min(1).max(400)).max(12),
  current_progress: z.string().trim().max(240).nullable(),
  upcoming: z.array(z.string().trim().min(1).max(400)).max(12),
  issues: z.array(z.string().trim().min(1).max(400)).max(12),
  closing: z.string().trim().max(800).default(""),
});

export const aiIntentSchema = z.enum(AI_INTENTS);

export const saveDailyReportDraftSchema = z.object({
  projectId: uuidSchema,
  draft: dailyReportDraftSchema,
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ConversationCreateInput = z.infer<typeof conversationCreateSchema>;
export type ConversationUpdateInput = z.infer<typeof conversationUpdateSchema>;
export type DailyReportDraftInput = z.infer<typeof dailyReportDraftSchema>;
export type ClientUpdateDraftInput = z.infer<typeof clientUpdateDraftSchema>;
