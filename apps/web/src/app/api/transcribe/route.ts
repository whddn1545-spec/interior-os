import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_MIME = new Set([
  "audio/mpeg", "audio/mp3", "audio/mp4", "audio/m4a",
  "audio/x-m4a", "audio/wav", "audio/wave", "audio/ogg",
  "audio/webm", "video/webm",
]);

const MAX_SIZE = 25 * 1024 * 1024; // Whisper 25 MB limit

function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY 없음");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const STRUCTURE_TOOL: OpenAI.Chat.ChatCompletionTool = {
  type: "function",
  function: {
    name: "structure_consultation",
    description: "통화 녹취록을 구조화된 상담 문서로 변환",
    parameters: {
      type: "object",
      required: ["summary", "requirements", "action_items", "quote_hints"],
      properties: {
        summary: {
          type: "string",
          description: "상담 핵심 요약 (2–4문장, 한국어)",
        },
        requirements: {
          type: "array",
          items: { type: "string" },
          description: "고객이 언급한 요구사항 목록 (예: '주방 타일 교체', '욕실 리모델링', '예산 1천만원 이하')",
        },
        action_items: {
          type: "array",
          items: { type: "string" },
          description: "다음 단계 할 일 목록 (예: '현장 방문 일정 잡기', '견적서 초안 전달')",
        },
        quote_hints: {
          type: "object",
          properties: {
            area_pyeong: { type: "string", description: "평수 (예: '32평')" },
            budget:      { type: "string", description: "예산 (예: '3천만원')" },
            trades:      { type: "array", items: { type: "string" }, description: "공종 목록" },
            style:       { type: "string", description: "스타일 키워드 (예: '모던 미니멀')" },
            move_in:     { type: "string", description: "입주 희망일 (예: '8월 말')" },
          },
        },
      },
    },
  },
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식" }, { status: 400 });
  }

  const file = formData.get("audio");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "오디오 파일이 없습니다" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "파일 크기가 25MB를 초과합니다" }, { status: 400 });
  }

  const mimeType = file.type || "audio/mpeg";
  if (!ALLOWED_MIME.has(mimeType)) {
    return NextResponse.json({ error: "지원하지 않는 파일 형식입니다 (m4a, mp3, wav, ogg, webm)" }, { status: 400 });
  }

  const client = getClient();

  // 1. Whisper STT
  let rawTranscript: string;
  let audioDurationSeconds: number | null = null;
  try {
    const transcription = await client.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "ko",
      response_format: "verbose_json",
    });
    rawTranscript = (transcription as { text: string }).text ?? "";
    audioDurationSeconds = Math.round((transcription as { duration?: number }).duration ?? 0) || null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `음성 인식 실패: ${msg}` }, { status: 500 });
  }

  if (!rawTranscript.trim()) {
    return NextResponse.json({ error: "음성을 인식할 수 없었습니다. 녹음 품질을 확인해주세요." }, { status: 422 });
  }

  // 2. GPT-4o 구조화
  let structured: {
    summary: string;
    requirements: string[];
    action_items: string[];
    quote_hints: Record<string, unknown>;
  };

  try {
    const chatRes = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content:
            "당신은 인테리어 리모델링 전문가를 보조하는 AI입니다. 고객과의 통화 녹취록을 분석해서 상담 문서를 작성합니다. 언급되지 않은 정보는 추측하지 마세요.",
        },
        {
          role: "user",
          content: `다음은 고객과의 통화 녹취록입니다:\n\n${rawTranscript}`,
        },
      ],
      tools: [STRUCTURE_TOOL],
      tool_choice: { type: "function", function: { name: "structure_consultation" } },
    });

    const tc = chatRes.choices[0]?.message?.tool_calls?.[0] as { function?: { arguments: string } } | undefined;
    const args = tc?.function?.arguments;
    if (!args) throw new Error("구조화 응답 없음");
    structured = JSON.parse(args) as typeof structured;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `내용 분석 실패: ${msg}` }, { status: 500 });
  }

  return NextResponse.json({
    rawTranscript,
    audioDurationSeconds,
    summary: structured.summary,
    requirements: structured.requirements ?? [],
    actionItems: structured.action_items ?? [],
    quoteHints: structured.quote_hints ?? {},
  });
}
