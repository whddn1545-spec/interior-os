import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { invokeAI } from "@/lib/ai/gateway";

export type CustomerGrade = "vip" | "gold" | "normal" | "dormant";

export interface CustomerGradeResult {
  customerId: string;
  recommendedGrade: CustomerGrade;
  reason: string;
}

const GRADE_TOOL: Anthropic.Messages.Tool = {
  name: "classify_customers",
  description: "고객 목록의 등급을 분류합니다.",
  input_schema: {
    type: "object",
    properties: {
      classifications: {
        type: "array",
        items: {
          type: "object",
          properties: {
            customerId: { type: "string" },
            recommendedGrade: { type: "string", enum: ["vip", "gold", "normal", "dormant"] },
            reason: { type: "string", description: "한 줄 이유 (한국어)" },
          },
          required: ["customerId", "recommendedGrade", "reason"],
        },
      },
    },
    required: ["classifications"],
  },
};

const SYSTEM_PROMPT = `당신은 인테리어 업체 CRM 전문가입니다.
고객의 공사 이력을 분석하여 등급을 분류합니다.

[등급 기준]
- VIP: 공사 3회 이상 또는 총매출 2000만원 이상, 최근 2년 내 공사
- 골드: 공사 2회 이상 또는 총매출 1000만원 이상, 최근 3년 내 공사
- 일반: 공사 1회, 또는 아직 견적/계약만 있음
- 휴면: 마지막 공사/상담 3년 초과, 또는 연락 두절

[절대 규칙]
- 제공된 데이터만 기반으로 판단. 추측 금지.
- 현재 등급과 달라야만 추천 의미가 있음(같아도 이유는 설명).
- classify_customers 도구를 반드시 사용.`;

export async function classifyCustomerGrades(
  customers: { id: string; name: string; currentGrade: string; siteCount: number; totalRevenue: number; lastSiteDate: string | null }[],
  tenantId: string
): Promise<CustomerGradeResult[]> {
  const customerText = customers
    .map((c) => `- ID:${c.id} 이름:${c.name} 현재등급:${c.currentGrade} 현장수:${c.siteCount}건 총매출:${c.totalRevenue.toLocaleString()}원 마지막현장:${c.lastSiteDate ?? "없음"}`)
    .join("\n");

  const userMessage: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: `다음 고객들의 등급을 분류해주세요:\n\n${customerText}` },
  ];

  const result = await invokeAI({
    task: "classify_customer_grades",
    promptVersion: "v1",
    model: "claude-sonnet-4-6",
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    tools: [GRADE_TOOL],
    maxTokens: 2048,
    tenantId,
  });

  for (const block of result.content) {
    if (block.type === "tool_use" && block.name === "classify_customers") {
      const parsed = block.input as { classifications: CustomerGradeResult[] };
      return parsed.classifications;
    }
  }

  return [];
}
