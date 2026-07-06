import "server-only";
import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { AI_MONTHLY_COST_CAP_USD } from "@/lib/plan";

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
    // ai_invocations INSERT는 RLS상 service_role 전용 — 사용자 세션으로는 조용히 실패한다
    const supabase = createAdminClient();
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

/**
 * 테넌트별 월 AI 비용 캡 검사 — 초과 시 throw.
 * 폭주(루프·남용)로 인한 비용 사고를 막는 안전장치.
 * 조회 실패 시에는 본 기능을 막지 않는다 (캡은 보호장치일 뿐 게이트가 아님).
 */
async function assertUnderMonthlyCap(tenantId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const [{ data: tenant }, { data: logs }] = await Promise.all([
      admin.from("tenants").select("plan").eq("id", tenantId).maybeSingle(),
      admin
        .from("ai_invocations")
        .select("cost_usd")
        .eq("tenant_id", tenantId)
        .gte("created_at", new Date(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1).toISOString()),
    ]);

    const plan = ((tenant as { plan?: string } | null)?.plan ?? "basic") as keyof typeof AI_MONTHLY_COST_CAP_USD;
    const cap = AI_MONTHLY_COST_CAP_USD[plan] ?? AI_MONTHLY_COST_CAP_USD.basic;
    const spent = ((logs ?? []) as { cost_usd: number | null }[]).reduce(
      (sum, l) => sum + Number(l.cost_usd ?? 0),
      0
    );

    if (spent >= cap) {
      throw new Error("이번 달 AI 사용량을 모두 사용했어요. 다음 달에 다시 이용하거나 플랜을 업그레이드해주세요.");
    }
  } catch (e) {
    // 캡 초과 에러만 전파, 조회 실패는 무시
    if (e instanceof Error && e.message.includes("AI 사용량")) throw e;
  }
}

export async function invokeAI(input: GatewayInput): Promise<GatewayOutput> {
  const client = getClient();
  const maxRetries = 2;

  // 테넌트가 특정된 호출은 월 비용 캡을 먼저 검사
  if (input.tenantId) {
    await assertUnderMonthlyCap(input.tenantId);
  }

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
