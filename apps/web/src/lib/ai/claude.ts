import "server-only";
import OpenAI from "openai";

export type SupportedMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export interface ExtractedPriceItem {
  tradeCode: string;
  tradeNameFromDoc: string;
  itemName: string;
  materialUnitPrice: number;
  laborDayRate: number;
  defaultDaysPerUnit: number;
  confidence: "high" | "medium" | "low";
  note?: string;
}

export interface PriceExtractionResult {
  items: ExtractedPriceItem[];
  parseError?: string;
}

const TRADE_CODES = [
  "flooring", "wallpaper", "tile", "paint", "carpentry",
  "electric", "plumbing", "demolition", "window", "bathroom",
  "kitchen", "film", "other",
];

const TRADE_GUIDE = `
  flooring: 강마루, 온돌마루, LVT, 장판, 마루판, 원목마루 등 바닥재
  wallpaper: 합지, 실크, 도배, 벽지, 천장지 등
  tile: 타일, 포세린, 대리석, 욕실타일, 바닥타일 등
  paint: 페인트, 수성페인트, 도장, 에폭시, 석고보드 등
  carpentry: 목공, 몰딩, 걸레받이, 문틀, 가구제작 등
  electric: 전기, 전등, 조명, 콘센트, 스위치 등
  plumbing: 배관, 설비, 보일러, 급수, 배수 등
  demolition: 철거, 해체, 제거, 폐기물 등
  window: 창문, 창호, 샷시, 방문, 현관문 등
  bathroom: 욕실, 화장실, 샤워부스, 욕조 등
  kitchen: 주방, 싱크대, 붙박이장, 주방가구 등
  film: 시트지, 필름, 래핑, 인테리어필름 등
  other: 위 항목에 해당 없는 경우`;

let _client: OpenAI | null = null;
function getClient() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY가 설정되지 않았습니다");
  if (!_client) _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

const EXTRACT_TOOL: OpenAI.Chat.ChatCompletionTool = {
  type: "function",
  function: {
    name: "extract_price_table",
    description: "단가표 이미지에서 공종별 자재명·단가·인건비·작업일수를 추출합니다.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tradeCode: { type: "string", description: `공종 코드 (${TRADE_CODES.join(", ")})` },
              tradeNameFromDoc: { type: "string", description: "문서에 표기된 원래 공종명" },
              itemName: { type: "string", description: "자재명 또는 세부 항목명" },
              materialUnitPrice: { type: "number", description: "자재 단가(원, 정수)" },
              laborDayRate: { type: "number", description: "인건비 일당(원, 정수)" },
              defaultDaysPerUnit: { type: "number", description: "단위당 작업일수 (소수 가능)" },
              confidence: { type: "string", enum: ["high", "medium", "low"], description: "인식 신뢰도" },
              note: { type: "string", description: "특이사항 (선택)" },
            },
            required: ["tradeCode", "tradeNameFromDoc", "itemName", "materialUnitPrice", "laborDayRate", "defaultDaysPerUnit", "confidence"],
          },
        },
      },
      required: ["items"],
    },
  },
};

const SYSTEM_PROMPT = `당신은 인테리어 단가표 이미지에서 데이터를 추출하는 전문 파서입니다.

추출 규칙:
- 금액은 원화 정수, 통화기호·쉼표 제거. 예) "3만원" → 30000
- 일당·작업일수가 없으면 0 설정 후 confidence를 "low"로
- tradeCode는 반드시 다음 중 하나: ${TRADE_CODES.join(", ")}
  공종 매핑:${TRADE_GUIDE}
- confidence: 명확하면 "high", 일부 추측 "medium", 흐리거나 불확실 "low"
- extract_price_table 함수를 반드시 사용하여 결과 반환`;

export async function extractPricesFromDocument(
  base64: string,
  mediaType: SupportedMediaType
): Promise<PriceExtractionResult> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mediaType};base64,${base64}`, detail: "high" },
          },
          {
            type: "text",
            text: "이 단가표 이미지에서 모든 공종·자재 항목을 추출해주세요. extract_price_table 함수로 반환하세요.",
          },
        ],
      },
    ],
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "function", function: { name: "extract_price_table" } },
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.type !== "function" || !toolCall.function?.arguments) {
    return { items: [], parseError: "AI가 항목을 추출하지 못했어요. 더 선명한 사진을 올려주세요." };
  }

  try {
    const parsed = JSON.parse(toolCall.function.arguments) as { items: ExtractedPriceItem[] };
    if (!Array.isArray(parsed.items)) {
      return { items: [], parseError: "응답 형식이 맞지 않아요" };
    }
    return { items: parsed.items };
  } catch {
    return { items: [], parseError: "AI 응답을 파싱할 수 없어요. 다시 시도해주세요." };
  }
}
