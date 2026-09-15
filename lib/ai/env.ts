/**
 * Server-only AI provider configuration.
 * Never expose these values to the browser or via NEXT_PUBLIC_*.
 */
export type AIProviderEnv = {
  apiKey: string;
  model: string;
  baseUrl: string;
};

export function getAIProviderEnv(): AIProviderEnv | null {
  const apiKey = process.env.AI_PROVIDER_API_KEY?.trim();
  const model = process.env.AI_MODEL?.trim();
  const baseUrl = (
    process.env.AI_PROVIDER_BASE_URL?.trim() || "https://api.openai.com/v1"
  ).replace(/\/+$/, "");

  if (!apiKey || !model) {
    return null;
  }

  return { apiKey, model, baseUrl };
}

export function isAIProviderConfigured(): boolean {
  return getAIProviderEnv() !== null;
}
