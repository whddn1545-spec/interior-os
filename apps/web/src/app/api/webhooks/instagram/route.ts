import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Instagram Graph API Webhook
// 등록: Meta 개발자 콘솔 → 앱 → Webhooks → instagram → Callback URL:
//   https://<도메인>/api/webhooks/instagram
// Verify Token: 환경변수 INSTAGRAM_VERIFY_TOKEN 값과 동일하게 입력

interface IgEntry {
  id: string;
  time: number;
  changes?: Array<{
    field: string;
    value: unknown;
  }>;
  messaging?: Array<{
    sender: { id: string };
    recipient: { id: string };
    message?: { text: string };
  }>;
}

interface IgWebhookBody {
  object: string;
  entry: IgEntry[];
}

// ── GET: Meta 웹훅 검증 ──────────────────────────────────────
export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "검증 실패" }, { status: 403 });
}

// ── POST: 이벤트 수신 ────────────────────────────────────────
export async function POST(req: NextRequest) {
  // X-Hub-Signature-256 검증 (선택 — App Secret 있을 때)
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (appSecret) {
    const sig = req.headers.get("x-hub-signature-256") ?? "";
    const rawBody = await req.text();
    const isValid = await verifySignature(rawBody, sig, appSecret);
    if (!isValid) {
      return NextResponse.json({ error: "서명 불일치" }, { status: 401 });
    }
    // 이미 text()로 읽었으므로 다시 파싱
    const body = JSON.parse(rawBody) as IgWebhookBody;
    await handleEvents(body);
  } else {
    const body = (await req.json()) as IgWebhookBody;
    await handleEvents(body);
  }

  // Meta는 200 OK를 받지 못하면 재전송 → 항상 200 반환
  return NextResponse.json({ ok: true });
}

async function handleEvents(body: IgWebhookBody) {
  if (body.object !== "instagram") return;

  const admin = createAdminClient();

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      // 댓글 알림 → instagram_posts 에 연결된 게시물 댓글 수 갱신
      if (change.field === "comments") {
        const val = change.value as Record<string, unknown>;
        const mediaId = val.media_id as string | undefined;
        if (mediaId) {
          // ig_media_id로 게시물 찾아 comment 이벤트 기록 (타입 우회 — updated_at은 DB 컬럼)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (admin.from("instagram_posts") as any)
            .update({ updated_at: new Date().toISOString() })
            .eq("ig_media_id", mediaId)
            .then(() => undefined, () => undefined);
        }
      }

      // 멘션 알림 → 별도 처리 (현재는 로그만)
      if (change.field === "mentions") {
        // 향후 CRM 연동: 멘션한 사용자를 잠재 고객으로 등록
      }
    }
  }
}

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signed = await crypto.subtle.sign("HMAC", key, enc.encode(body));
    const hex = Array.from(new Uint8Array(signed))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const expected = `sha256=${hex}`;
    // 타이밍 어택 방지 — 길이 다르면 false
    if (expected.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}
