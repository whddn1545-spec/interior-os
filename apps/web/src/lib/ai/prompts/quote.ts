import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { invokeAI } from "@/lib/ai/gateway";

export interface QuoteDoc {
  summary: string; // 1-2문장 제안 요지
  scopeDescription: string; // 공사 범위 서술
  terms: string; // 유효기간·부가세 등
  closing: string; // 마무리 문구
}

export interface GenerateQuoteDocInput {
  quote: {
    id: string;
    version: number;
    totalAmount: number;
    subtotal: number;
    distanceFactor: number;
    difficultyFactor: number;
    reserveRate: number;
    contingencyRate: number;
  };
  items: {
    tradeNameKo: string;
    description: string;
    quantity: number;
    unit: string;
    lineTotal: number;
  }[];
  siteName: string;
  customerName: string;
  tenantBusinessName: string;
  audience: "customer" | "internal";
  tenantId: string;
}

const RENDER_QUOTE_TOOL: Anthropic.Messages.Tool = {
  name: "render_quote",
  description: "견적서 본문 섹션을 구조화된 형식으로 출력합니다.",
  input_schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "1-2문장 제안 요지. 금액 수치를 재계산하지 말고 제공된 숫자 그대로 인용.",
      },
      scopeDescription: {
        type: "string",
        description: "공사 범위 서술. 공종명과 제공된 공사 내용을 자연스럽게 서술.",
      },
      terms: {
        type: "string",
        description: "유효기간, 부가세 포함 여부, 결제 조건 등 표준 조건 안내.",
      },
      closing: {
        type: "string",
        description: "마무리 문구. 고객사명과 업체명을 활용한 감사 인사.",
      },
    },
    required: ["summary", "scopeDescription", "terms", "closing"],
  },
};

function buildSystemPrompt(audience: "customer" | "internal"): string {
  const base = `당신은 20년 경력의 인테리어 견적 문서 전문가입니다.
고객이 신뢰할 수 있는 전문적인 견적서 본문을 작성합니다.

[절대 준수 원칙]
- 금액 재계산 절대 금지: 제공된 숫자를 그대로 인용하십시오. 어떤 경우에도 금액을 직접 계산하거나 추산하지 마십시오.
- render_quote 도구를 반드시 사용하여 구조화된 형식으로 출력하십시오.
- 한국어로 작성하십시오.
- 전문적이고 신뢰감 있는 문체를 사용하십시오.`;

  if (audience === "customer") {
    return (
      base +
      `

[고객용 문서 주의사항]
- 원가, 마진, 일당, 내부 요율(distanceFactor, difficultyFactor, reserveRate, contingencyRate) 정보를 절대 노출하지 마십시오.
- 금액은 총액(totalAmount)만 언급하십시오.
- 긍정적이고 전문적인 인상을 주는 문체를 사용하십시오.`
    );
  }

  return (
    base +
    `

[내부용 문서 주의사항]
- 공사 범위와 공종별 내역을 상세히 서술할 수 있습니다.
- 내부 검토를 위한 객관적인 서술을 사용하십시오.`
  );
}

export async function generateQuoteDoc(
  input: GenerateQuoteDocInput
): Promise<QuoteDoc> {
  const { quote, items, siteName, customerName, tenantBusinessName, audience, tenantId } =
    input;

  const itemsText = items
    .map(
      (item, i) =>
        `${i + 1}. ${item.tradeNameKo}: ${item.description} (${item.quantity}${item.unit}, 금액: ${item.lineTotal.toLocaleString("ko-KR")}원)`
    )
    .join("\n");

  const isCustomer = audience === "customer";

  const userMessage = `다음 정보를 바탕으로 견적서 본문을 작성해 주십시오.

[현장 정보]
- 현장명: ${siteName}
- 고객명: ${customerName}
- 시공사: ${tenantBusinessName}
- 견적번호: ${quote.id} (v${quote.version})

[금액 정보]
- 소계: ${quote.subtotal.toLocaleString("ko-KR")}원
- 총액: ${quote.totalAmount.toLocaleString("ko-KR")}원
${
  !isCustomer
    ? `- 거리 할증: ${quote.distanceFactor}
- 난이도 할증: ${quote.difficultyFactor}
- 예비비율: ${quote.reserveRate}
- 불확실성율: ${quote.contingencyRate}`
    : ""
}

[공사 항목]
${itemsText}

위 제공된 금액 수치를 그대로 인용하여 견적서 본문을 작성하십시오. 금액을 재계산하거나 변경하지 마십시오.`;

  const result = await invokeAI({
    task: "generate_quote_text",
    promptVersion: "v1",
    model: "claude-opus-4-8",
    systemPrompt: buildSystemPrompt(audience),
    userMessage,
    tools: [RENDER_QUOTE_TOOL],
    maxTokens: 2048,
    tenantId,
  });

  // tool_use 블록에서 render_quote 결과 추출
  for (const block of result.content) {
    if (block.type === "tool_use" && block.name === "render_quote") {
      const parsed = block.input as Record<string, unknown>;
      return {
        summary: String(parsed.summary ?? ""),
        scopeDescription: String(parsed.scopeDescription ?? ""),
        terms: String(parsed.terms ?? ""),
        closing: String(parsed.closing ?? ""),
      };
    }
  }

  throw new Error("견적서 본문 생성에 실패했습니다: render_quote 도구 응답을 받지 못했습니다.");
}
