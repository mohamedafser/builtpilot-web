export const AI_USER_ERRORS = {
  unauthenticated: "You must be signed in to continue.",
  unauthorizedProject: "You don't have access to this project.",
  unauthorizedConversation: "You don't have access to this conversation.",
  missingProject:
    "Choose a project so I can answer from that project's data.",
  missingData: "I don't have enough project data to answer that.",
  providerUnavailable:
    "BuildPilot AI is temporarily unavailable. Please try again.",
  providerTimeout: "BuildPilot AI took too long to respond. Please try again.",
  rateLimited:
    "You're sending requests too quickly. Please wait a moment and try again.",
  invalidResponse:
    "BuildPilot AI returned an unusable response. Please try again.",
  notConfigured:
    "BuildPilot AI is not configured yet. Add AI_PROVIDER_API_KEY and AI_MODEL on the server.",
  database: "Unable to load BuildPilot AI right now. Please try again.",
} as const;

export type AIUserErrorKey = keyof typeof AI_USER_ERRORS;

export class AIRequestError extends Error {
  readonly status: number;
  readonly key: AIUserErrorKey;

  constructor(key: AIUserErrorKey, status: number, message?: string) {
    super(message ?? AI_USER_ERRORS[key]);
    this.name = "AIRequestError";
    this.key = key;
    this.status = status;
  }
}

export function isAIRequestError(error: unknown): error is AIRequestError {
  return error instanceof AIRequestError;
}
