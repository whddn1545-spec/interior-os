import "server-only";
import type OpenAI from "openai";
import { invokeAI } from "@/lib/ai/gateway";

export interface ContractDoc {
  preamble: string;
  articles: { title: string; body: string }[];
  paymentTable: { label: string; amount: number; dueDate?: string }[];
  signingNote: string;
}

export interface GenerateContractDocInput {
  quote: {
    totalAmount: number;
    siteName: string;
    customerName: string;
  };
  paymentTerms: {
    deposit: number;
    interim: number;
    final: number;
  };
  startDate?: string;
  endDate?: string;
  specialTerms?: string;
  tenantBusinessName: string;
  tenantId: string;
}

const RENDER_CONTRACT_TOOL: OpenAI.Chat.ChatCompletionTool = {
  type: "function",
  function: {
    name: "render_contract",
    description: "인테리어 표준 도급계약서를 구조화된 형식으로 출력합니다.",
    parameters: {
      type: "object",
      properties: {
        preamble: {
          type: "string",
          description: "계약서 전문(前文). 당사자 소개 및 계약 목적 서술.",
        },
        articles: {
          type: "array",
          description: "계약 조항 목록",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "조항 제목 (예: 제1조 공사범위)" },
              body: { type: "string", description: "조항 본문" },
            },
            required: ["title", "body"],
          },
        },
        paymentTable: {
          type: "array",
          description: "대금 지급 일정표",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "항목명 (예: 계약금, 중도금, 잔금)" },
              amount: { type: "number", description: "금액 (원). 제공된 값 그대로 사용." },
              dueDate: { type: "string", description: "납부 기한 (선택)" },
            },
            required: ["label", "amount"],
          },
        },
        signingNote: {
          type: "string",
          description: "서명란 안내 문구 및 법적 효력 고지.",
        },
      },
      required: ["preamble", "articles", "paymentTable", "signingNote"],
    },
  },
};

const SYSTEM_PROMPT = `당신은 인테리어 표준 도급계약서 작성 보조자입니다.
한국 인테리어 업계 관행에 맞는 표준 도급계약서 초안을 작성합니다.

[절대 준수 원칙]
- 금액 재계산 절대 금지: 제공된 금액과 비율을 그대로 사용하십시오.
- render_contract 함수를 반드시 사용하여 구조화된 형식으로 출력하십시오.
- 한국어로 작성하십시오.

[법적 고지]
- 이 문서는 계약서 초안 작성 보조 목적으로만 사용됩니다.
- signingNote에 "본 계약서는 AI가 생성한 초안으로, 서명 전 반드시 전문가 검토를 권고합니다"를 포함하십시오.

[표준 조항 구성]
제1조 공사 범위, 제2조 공사 기간, 제3조 공사 금액, 제4조 대금 지급,
제5조 하자 담보, 제6조 계약 해제, 제7조 분쟁 해결 순서로 작성하십시오.`;

export async function generateContractDoc(input: GenerateContractDocInput): Promise<ContractDoc> {
  const { quote, paymentTerms, startDate, endDate, specialTerms, tenantBusinessName, tenantId } = input;

  const depositAmount = Math.round(quote.totalAmount * paymentTerms.deposit);
  const interimAmount = Math.round(quote.totalAmount * paymentTerms.interim);
  const finalAmount = Math.round(quote.totalAmount * paymentTerms.final);

  const userMessage = `다음 정보를 바탕으로 인테리어 도급계약서 초안을 작성해 주십시오.

[계약 당사자]
- 수급인(시공사): ${tenantBusinessName}
- 도급인(고객): ${quote.customerName}

[공사 정보]
- 현장명: ${quote.siteName}
- 총 공사금액: ${quote.totalAmount.toLocaleString("ko-KR")}원
${startDate ? `- 공사 시작일: ${startDate}` : ""}
${endDate ? `- 공사 준공일: ${endDate}` : ""}

[대금 지급 계획]
- 계약금: ${paymentTerms.deposit * 100}% = ${depositAmount.toLocaleString("ko-KR")}원 (계약 시)
- 중도금: ${paymentTerms.interim * 100}% = ${interimAmount.toLocaleString("ko-KR")}원
- 잔금: ${paymentTerms.final * 100}% = ${finalAmount.toLocaleString("ko-KR")}원 (준공 시)
${specialTerms ? `\n[특약 사항]\n${specialTerms}` : ""}

위 제공된 금액 수치를 그대로 사용하여 계약서를 작성하십시오.`;

  const result = await invokeAI({
    task: "generate_contract",
    promptVersion: "v1",
    model: "gpt-4o",
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    tools: [RENDER_CONTRACT_TOOL],
    maxTokens: 4096,
    tenantId,
  });

  if (!result.toolInputs) {
    throw new Error("계약서 생성에 실패했습니다.");
  }

  const parsed = result.toolInputs;

  const articles = Array.isArray(parsed.articles)
    ? (parsed.articles as { title: string; body: string }[])
    : [];

  const paymentTable = Array.isArray(parsed.paymentTable)
    ? (parsed.paymentTable as { label: string; amount: number; dueDate?: string }[])
    : [];

  return {
    preamble: String(parsed.preamble ?? ""),
    articles,
    paymentTable,
    signingNote: String(parsed.signingNote ?? ""),
  };
}
