import "server-only";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY가 설정되지 않았습니다");
  }
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

const MODEL_PRICING: Record<string, { inputPerM: number; outputPerM: number }> = {
  "gpt-4o": { inputPerM: 2.5, outputPerM: 10 },
  "gpt-4o-mini": { inputPerM: 0.15, outputPerM: 0.6 },
};

export interface GatewayInput {
  task: string;
  promptVersion: string;
  model: string;
  systemPrompt: string;
  userMessage: string | OpenAI.Chat.ChatCompletionMessageParam[];
  tools?: OpenAI.Chat.ChatCompletionTool[];
  maxTokens?: number;
  tenantId?: string;
}

export interface GatewayOutput {
  toolInputs: Record<string, unknown> | null;
  textContent: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
}

async function logInvocation(params: {
  tenantId: string | undefined;
  task: string;
  promptVersion: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  errorMessage?: string;
}): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("ai_invocations").insert({
      tenant_id: params.tenantId ?? null,
      task: params.task,
      prompt_version: params.promptVersion,
      model: params.model,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      cost_usd: params.costUsd,
      latency_ms: params.latencyMs,
      success: !params.errorMessage,
      error_message: params.errorMessage ?? null,
    });
  } catch {
    // 로깅 실패는 본 동작에 영향 없음
  }
}

function calcCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] ?? { inputPerM: 0, outputPerM: 0 };
  return (inputTokens / 1_000_000) * pricing.inputPerM + (outputTokens / 1_000_000) * pricing.outputPerM;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function invokeAI(input: GatewayInput): Promise<GatewayOutput> {
  const client = getClient();
  const maxRetries = 2;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] =
    typeof input.userMessage === "string"
      ? [{ role: "user", content: input.userMessage }]
      : input.userMessage;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const startedAt = Date.now();

    try {
      const response = await client.chat.completions.create({
        model: input.model,
        max_tokens: input.maxTokens ?? 4096,
        messages: [{ role: "system", content: input.systemPrompt }, ...messages],
        ...(input.tools && input.tools.length > 0
          ? { tools: input.tools, tool_choice: "required" as const }
          : {}),
      });

      const latencyMs = Date.now() - startedAt;
      const inputTokens = response.usage?.prompt_tokens ?? 0;
      const outputTokens = response.usage?.completion_tokens ?? 0;
      const costUsd = calcCost(input.model, inputTokens, outputTokens);

      const message = response.choices[0]?.message;
      const textContent = message?.content ?? "";

      let toolInputs: Record<string, unknown> | null = null;
      if (message?.tool_calls && message.tool_calls.length > 0) {
        try {
          const tc = message.tool_calls[0] as { function?: { arguments: string } };
          if (tc.function?.arguments) {
            toolInputs = JSON.parse(tc.function.arguments) as Record<string, unknown>;
          }
        } catch {
          toolInputs = null;
        }
      }

      logInvocation({
        tenantId: input.tenantId,
        task: input.task,
        promptVersion: input.promptVersion,
        model: input.model,
        inputTokens,
        outputTokens,
        costUsd,
        latencyMs,
      }).catch(() => undefined);

      return { toolInputs, textContent, inputTokens, outputTokens, costUsd, latencyMs };
    } catch (err) {
      lastError = err;
      const latencyMs = Date.now() - startedAt;

      if (attempt < maxRetries) {
        await sleep(500 * Math.pow(2, attempt));
        continue;
      }

      const errorMessage = err instanceof Error ? err.message : String(err);
      logInvocation({
        tenantId: input.tenantId,
        task: input.task,
        promptVersion: input.promptVersion,
        model: input.model,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        latencyMs,
        errorMessage,
      }).catch(() => undefined);
    }
  }

  throw lastError;
}
