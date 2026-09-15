import { createClient } from "@/lib/supabase/server";

export async function recordAIUsage(input: {
  businessId: string;
  userId: string;
  conversationId?: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}): Promise<void> {
  const supabase = await createClient();
  await supabase.from("ai_usage").insert({
    business_id: input.businessId,
    user_id: input.userId,
    conversation_id: input.conversationId ?? null,
    model: input.model.slice(0, 120),
    input_tokens: input.inputTokens,
    output_tokens: input.outputTokens,
  });
}
