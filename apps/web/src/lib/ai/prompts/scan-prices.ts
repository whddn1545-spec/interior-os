import "server-only";
import type OpenAI from "openai";
import { invokeAI } from "@/lib/ai/gateway";

export interface ScannedPriceItem {
  tradeCode: string;
  itemName: string;
  materialUnitPrice: number;
  laborDayRate: number;
  defaultDaysPerUnit: number;
}

export interface ScanPriceBookInput {
  imageUrl: string;
  availableTradeCodes: { code: string; nameKo: string }[];
  tenantId: string;
}

const SCAN_PRICEBOOK_TOOL: OpenAI.Chat.ChatCompletionTool = {
  type: "function",
  function: {
    name: "scan_pricebook",
    description: "이미지(종이 단가표 또는 엑셀 사진)에서 단가 항목 목록을 추출합니다.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          description: "인식된 단가 항목 목록",
          items: {
            type: "object",
            properties: {
              tradeCode: {
                type: "string",
                description: "항목에 해당하는 가장 적합한 공종 코드. availableTradeCodes 목록 중 하나.",
              },
              itemName: {
                type: "string",
                description: "항목 이름 (예: 실크벽지, 강마루, 일반 타일 등)",
              },
              materialUnitPrice: {
                type: "number",
                description: "자재 단가(원 단위, 숫자만). 없으면 0.",
              },
              laborDayRate: {
                type: "number",
                description: "인건비 일당(원 단위, 품, 숫자만). 없으면 0.",
              },
              defaultDaysPerUnit: {
                type: "number",
                description: "단위당 기본 소요일. 보통 1. 모르면 1로 설정.",
              },
            },
            required: ["tradeCode", "itemName", "materialUnitPrice", "laborDayRate", "defaultDaysPerUnit"],
          },
        },
      },
      required: ["items"],
    },
  },
};

const SYSTEM_PROMPT = `당신은 인테리어 단가표 데이터 변환 전문가입니다.
제공된 단가표 사진(수기 노트, 인쇄물, 엑셀 캡처 등)을 분석하여 데이터베이스에 넣을 수 있는 구조화된 JSON 형태로 변환해야 합니다.

[분석 기준]
- 사진에 여러 공종의 단가가 섞여 있을 수 있습니다. 각 항목이 어떤 공종(tradeCode)에 속하는지 맥락을 보고 판단하세요.
- 금액은 모두 "원(₩)" 단위의 숫자로만 추출하세요. (예: "1만 8천" -> 18000, "300,000" -> 300000).
- 자재비와 인건비가 나뉘어 있다면 각각 materialUnitPrice, laborDayRate로 분리하고, 통짜 단가라면 materialUnitPrice에 넣고 laborDayRate는 0으로 하세요.
- scan_pricebook 함수를 반드시 사용하여 결과를 반환하십시오.`;

export async function scanPriceBook(input: ScanPriceBookInput): Promise<ScannedPriceItem[]> {
  const { imageUrl, availableTradeCodes, tenantId } = input;

  const tradeListText = availableTradeCodes
    .map((t) => `- ${t.code}: ${t.nameKo}`)
    .join("\n");

  const userMessage: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `다음 단가표 사진에서 모든 단가 항목을 추출해 주십시오.

[사용 가능한 공종 코드]
${tradeListText}

각 항목의 공종 코드는 위 목록에서 가장 적합한 것을 선택하십시오.`,
        },
        {
          type: "image_url",
          image_url: { url: imageUrl },
        },
      ],
    },
  ];

  const result = await invokeAI({
    task: "scan_pricebook",
    promptVersion: "v1",
    model: "gpt-4o",
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    tools: [SCAN_PRICEBOOK_TOOL],
    maxTokens: 2000,
    tenantId,
  });

  if (!result.toolInputs || !Array.isArray((result.toolInputs as unknown as { items: unknown }).items)) {
    throw new Error("AI failed to return scan_pricebook tool call");
  }

  return (result.toolInputs as { items: ScannedPriceItem[] }).items;
}
