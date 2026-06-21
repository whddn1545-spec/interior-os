import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { invokeAI } from "@/lib/ai/gateway";

export interface InstagramCaption {
  caption: string;
  hashtags: string[];
}

const CAPTION_TOOL: Anthropic.Messages.Tool = {
  name: "generate_caption",
  description: "인테리어 시공 사진용 인스타그램 캡션을 생성합니다.",
  input_schema: {
    type: "object",
    properties: {
      caption: {
        type: "string",
        description: "인스타그램 게시물 본문. 한국어, 이모지 포함. 3~5문장. 고객 신뢰감 있는 톤.",
      },
      hashtags: {
        type: "array",
        items: { type: "string" },
        description: "해시태그 목록 (# 포함, 10~15개).",
      },
    },
    required: ["caption", "hashtags"],
  },
};

const SYSTEM_PROMPT = `당신은 인테리어 업체 SNS 마케팅 전문가입니다.
시공 사진과 정보를 바탕으로 고객 신뢰감을 주는 인스타그램 캡션을 작성합니다.

[절대 규칙]
- 과장·허위 정보 금지. 사진에 보이는 것만 기술.
- 구체적 가격 언급 금지.
- 자연스러운 한국어, 이모지 적절히 활용.
- 업체명/연락처는 포함하지 않음(사업자가 직접 추가).

generate_caption 도구를 반드시 사용하여 결과를 반환하십시오.`;

export async function generateInstagramCaption(input: {
  tradeNameKo: string;
  phase: string;
  siteInfo: string;
  captionHint: string;
  tenantId: string;
}): Promise<InstagramCaption> {
  const phaseLabel = { before: "시공 전", progress: "시공 중", after: "시공 완료" }[input.phase] ?? "";

  const userMessage: Anthropic.Messages.MessageParam[] = [
    {
      role: "user",
      content: `다음 인테리어 시공 사진의 인스타그램 캡션을 작성해주세요.

공종: ${input.tradeNameKo}
단계: ${phaseLabel}
현장 정보: ${input.siteInfo}
참고 힌트: ${input.captionHint}

자연스럽고 신뢰감 있는 캡션과 관련 해시태그를 작성해주세요.`,
    },
  ];

  const result = await invokeAI({
    task: "generate_instagram_caption",
    promptVersion: "v1",
    model: "claude-sonnet-4-6",
    systemPrompt: SYSTEM_PROMPT,
    userMessage,
    tools: [CAPTION_TOOL],
    maxTokens: 1024,
    tenantId: input.tenantId,
  });

  for (const block of result.content) {
    if (block.type === "tool_use" && block.name === "generate_caption") {
      const parsed = block.input as { caption: string; hashtags: string[] };
      return { caption: parsed.caption, hashtags: parsed.hashtags };
    }
  }

  throw new Error("캡션 생성 실패");
}
