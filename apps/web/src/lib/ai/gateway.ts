import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

// Anthropic 클라이언트 싱글톤
let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY가 설정되지 않았습니다");
  }
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return _client;
}

// 모델별 비용 (per 1M tokens, USD)
const MODEL_PRICING: Record<
  string,
  { inputPerM: number; outputPerM: number }
> = {
  "claude-opus-4-8": { inputPerM: 15, outputPerM: 75 },
  "claude-sonnet-4-6": { inputPerM: 3, outputPerM: 15 },
};

export interface GatewayInput {
  task: string; // 'generate_quote_text' | 'generate_contract' | 'tag_photo'
  promptVersion: string; // 'v1', 'v2' 등
  model: "claude-opus-4-8" | "claude-sonnet-4-6";
  systemPrompt: string;
  userMessage: string | Anthropic.Messages.MessageParam[];
  tools?: Anthropic.Messages.Tool[];
  maxTokens?: number;
  tenantId?: string; // ai_invocations 로깅용
}

export interface GatewayOutput {
  content: Anthropic.Messages.ContentBlock[];
  inputTokens: number;
  outputTokens: number;
  costUsd: number; // 토큰 기준 추산
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

function calcCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model] ?? { inputPerM: 0, outputPerM: 0 };
  return (
    (inputTokens / 1_000_000) * pricing.inputPerM +
    (outputTokens / 1_000_000) * pricing.outputPerM
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function invokeAI(input: GatewayInput): Promise<GatewayOutput> {
  const client = getClient();
  const maxRetries = 2;
  const timeoutMs = 30_000;

  const messages: Anthropic.Messages.MessageParam[] =
    typeof input.userMessage === "string"
      ? [{ role: "user", content: input.userMessage }]
      : input.userMessage;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const startedAt = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      let response: Anthropic.Messages.Message;
      try {
        const createParams: Anthropic.Messages.MessageCreateParamsNonStreaming =
          {
            model: input.model,
            max_tokens: input.maxTokens ?? 4096,
            system: input.systemPrompt,
            messages,
            ...(input.tools && input.tools.length > 0
              ? {
                  tools: input.tools,
                  tool_choice: { type: "any" } as Anthropic.Messages.ToolChoiceAny,
                }
              : {}),
          };

        response = await client.messages.create(createParams, {
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      const latencyMs = Date.now() - startedAt;
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;
      const costUsd = calcCost(input.model, inputTokens, outputTokens);

      // 비동기 로깅 (await 하지 않아 본 동작 차단 없음)
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

      return {
        content: response.content,
        inputTokens,
        outputTokens,
        costUsd,
        latencyMs,
      };
    } catch (err) {
      lastError = err;
      const latencyMs = Date.now() - startedAt;

      if (attempt < maxRetries) {
        const waitMs = 500 * Math.pow(2, attempt);
        await sleep(waitMs);
        continue;
      }

      // 마지막 시도 실패 — 로깅 후 throw
      const errorMessage =
        err instanceof Error ? err.message : String(err);
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
