import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY가 설정되지 않았습니다");
  }
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export type SupportedMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif"
  | "application/pdf";

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

export async function extractPricesFromDocument(
  base64: string,
  mediaType: SupportedMediaType
): Promise<PriceExtractionResult> {
  const client = getClient();

  const systemPrompt = `당신은 인테리어 단가표 문서에서 데이터를 추출하는 파서입니다.
이미지 또는 PDF에서 공종별 자재 단가, 인건비(일당), 단위당 작업일수를 추출해 JSON으로만 반환합니다.

추출 규칙:
- 금액은 원화 정수, 통화기호·쉼표·단위 제거. 예) "3만원" → 30000, "30,000원" → 30000
- 평당·㎡당 단가가 보이면 그대로 추출(자재 단가)
- 일당이 없으면 0, 작업일수가 없으면 0으로 설정하고 confidence를 "low"로
- tradeCode는 반드시 다음 중 하나: ${TRADE_CODES.join(", ")}
  공종 매핑 기준:${TRADE_GUIDE}
- confidence: 명확히 읽히면 "high", 일부 추측이면 "medium", 흐리거나 잘 모르면 "low"
- 마크다운 없이 JSON만 반환`;

  const exampleJson = `{"items":[{"tradeCode":"flooring","tradeNameFromDoc":"강마루","itemName":"강마루(브라운)","materialUnitPrice":30000,"laborDayRate":250000,"defaultDaysPerUnit":0.12,"confidence":"high","note":""}]}`;

  const userContent: Anthropic.MessageParam["content"] =
    mediaType === "application/pdf"
      ? [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          } as Anthropic.DocumentBlockParam,
          {
            type: "text",
            text: `이 단가표 문서에서 모든 공종·자재 항목을 추출하세요. 다음 JSON 스키마로만 반환하세요:\n${exampleJson}`,
          },
        ]
      : [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as Anthropic.Base64ImageSource["media_type"],
              data: base64,
            },
          } as Anthropic.ImageBlockParam,
          {
            type: "text",
            text: `이 단가표 이미지에서 모든 공종·자재 항목을 추출하세요. 다음 JSON 스키마로만 반환하세요:\n${exampleJson}`,
          },
        ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  const rawText =
    response.content[0]?.type === "text" ? response.content[0].text : "";

  try {
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as PriceExtractionResult;
    if (!Array.isArray(parsed.items)) {
      return { items: [], parseError: "응답 형식이 맞지 않아요" };
    }
    return { items: parsed.items };
  } catch {
    return { items: [], parseError: "AI 응답을 파싱할 수 없어요. 다시 시도해주세요." };
  }
}
