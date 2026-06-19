import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { invokeAI } from "@/lib/ai/gateway";

export interface PhotoTag {
  tradeCode: string; // 제공된 codes 중 하나 또는 "unknown"
  phase: "before" | "progress" | "after";
  qualityScore: number; // 0~100
  confidence: number; // 0~1
  captionHint: string; // 인스타 캡션 힌트 (한 줄)
}

export interface TagPhotoInput {
  imageUrl: string; // Supabase Storage URL (public)
  availableTradeCodes: { code: string; nameKo: string }[];
  tenantId: string;
}

const TAG_PHOTO_TOOL: Anthropic.Messages.Tool = {
  name: "tag_photo",
  description: "인테리어 시공 사진을 분석하여 태그 정보를 반환합니다.",
  input_schema: {
    type: "object",
    properties: {
      tradeCode: {
        type: "string",
        description:
          "사진에 해당하는 공종 코드. 제공된 availableTradeCodes 목록에 있는 코드 중 하나를 선택하거나, 해당 없으면 'unknown'.",
      },
      phase: {
        type: "string",
        enum: ["before", "progress", "after"],
        description:
          "공사 단계. before=공사 전, progress=공사 중, after=공사 후.",
      },
      qualityScore: {
        type: "number",
        description:
          "사진 품질 점수 (0~100). 선명도, 구도, 조명, 시공 품질을 종합 평가.",
      },
      confidence: {
        type: "number",
        description: "분류 신뢰도 (0~1). 1에 가까울수록 확실한 분류.",
      },
      captionHint: {
        type: "string",
        description:
          "인스타그램 캡션 힌트 한 줄. 한국어, 이모지 포함 가능, 해시태그 제외.",
      },
    },
    required: ["tradeCode", "phase", "qualityScore", "confidence", "captionHint"],
  },
};

const SYSTEM_PROMPT = `당신은 인테리어 시공 현장 사진 분석 전문가입니다.
제공된 사진을 분석하여 공종, 공사 단계, 품질을 정확하게 태깅합니다.

[분석 기준]
- 공종(tradeCode): 제공된 공종 코드 목록에서만 선택. 해당 없으면 'unknown'.
- 공사 단계: before(공사 전 현황), progress(공사 진행 중), after(공사 완료).
- 품질 점수: 사진의 선명도·구도·조명과 시공 품질을 종합 평가 (0~100).
- 신뢰도: 분류의 확실성 (0~1).
- 캡션 힌트: 인테리어 인스타그램에 어울리는 한 줄 문구.

tag_photo 도구를 반드시 사용하여 결과를 반환하십시오.`;

export async function tagPhoto(input: TagPhotoInput): Promise<PhotoTag> {
  const { imageUrl, availableTradeCodes, tenantId } = input;

  const tradeListText = availableTradeCodes
    .map((t) => `- ${t.code}: ${t.nameKo}`)
    .join("\n");

  const userMessage: Anthropic.Messages.MessageParam[] = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `다음 인테리어 시공 사진을 분석해 주십시오.

[사용 가능한 공종 코드]
${tradeListText}

위 코드 목록에서 가장 적합한 공종을 선택하거나, 해당 없으면 'unknown'으로 표기하십시오.`,
        },
        {
          type: "image",
          source: {
            type: "url",
            url: imageUrl,
          },
        },
      ],
    },
  ];

  const result = await invokeAI({
    task: "tag_photo",
    promptVersion: "v1",
    model: "claude-sonnet-4-6",
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    tools: [TAG_PHOTO_TOOL],
    maxTokens: 1024,
    tenantId,
  });

  // tool_use 블록에서 tag_photo 결과 추출
  for (const block of result.content) {
    if (block.type === "tool_use" && block.name === "tag_photo") {
      const parsed = block.input as Record<string, unknown>;

      const phase = parsed.phase as string;
      if (phase !== "before" && phase !== "progress" && phase !== "after") {
        throw new Error(`사진 태깅 실패: 유효하지 않은 phase 값 '${phase}'`);
      }

      return {
        tradeCode: String(parsed.tradeCode ?? "unknown"),
        phase,
        qualityScore: Number(parsed.qualityScore ?? 0),
        confidence: Number(parsed.confidence ?? 0),
        captionHint: String(parsed.captionHint ?? ""),
      };
    }
  }

  throw new Error(
    "사진 태깅에 실패했습니다: tag_photo 도구 응답을 받지 못했습니다."
  );
}
