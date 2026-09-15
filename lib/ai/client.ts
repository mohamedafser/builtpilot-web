import {
  MAX_AI_OUTPUT_TOKENS,
  MAX_AI_STRUCTURED_TOKENS,
} from "@/constants/ai";
import { getAIProviderEnv } from "@/lib/ai/env";
import { AIRequestError } from "@/lib/ai/errors";
import type {
  AIGenerateInput,
  AIGenerateResult,
  AIProvider,
} from "@/lib/ai/types";

type ChatCompletionResponse = {
  model?: string;
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
};

const REQUEST_TIMEOUT_MS = 45_000;

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);

  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new AIRequestError("invalidResponse", 502);
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1)) as unknown;
  } catch {
    throw new AIRequestError("invalidResponse", 502);
  }
}

async function requestCompletion(
  input: AIGenerateInput,
): Promise<AIGenerateResult> {
  const env = getAIProviderEnv();

  if (!env) {
    throw new AIRequestError("notConfigured", 503);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.model,
        temperature: 0.2,
        max_tokens: input.maxOutputTokens ?? MAX_AI_OUTPUT_TOKENS,
        messages: input.messages,
        ...(input.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });

    if (response.status === 429) {
      throw new AIRequestError("rateLimited", 429);
    }

    if (response.status === 401 || response.status === 403) {
      throw new AIRequestError("providerUnavailable", 503);
    }

    if (!response.ok) {
      throw new AIRequestError("providerUnavailable", 503);
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const text = payload.choices?.[0]?.message?.content?.trim() ?? "";

    if (!text) {
      throw new AIRequestError("invalidResponse", 502);
    }

    return {
      text,
      model: payload.model ?? env.model,
      inputTokens: payload.usage?.prompt_tokens ?? null,
      outputTokens: payload.usage?.completion_tokens ?? null,
    };
  } catch (error) {
    if (error instanceof AIRequestError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new AIRequestError("providerTimeout", 504);
    }

    throw new AIRequestError("providerUnavailable", 503);
  } finally {
    clearTimeout(timer);
  }
}

export function createAIProvider(): AIProvider {
  return {
    async generateResponse(input) {
      return requestCompletion(input);
    },
    async generateStructuredResponse(input, parse) {
      try {
        const usage = await requestCompletion({
          ...input,
          json: true,
          maxOutputTokens: input.maxOutputTokens ?? MAX_AI_STRUCTURED_TOKENS,
        });
        return { value: parse(extractJson(usage.text)), usage };
      } catch (error) {
        if (
          error instanceof AIRequestError &&
          error.key === "invalidResponse"
        ) {
          const usage = await requestCompletion({
            ...input,
            json: false,
            maxOutputTokens: input.maxOutputTokens ?? MAX_AI_STRUCTURED_TOKENS,
          });
          return { value: parse(extractJson(usage.text)), usage };
        }

        throw error;
      }
    },
  };
}

let cachedProvider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!cachedProvider) {
    cachedProvider = createAIProvider();
  }

  return cachedProvider;
}
