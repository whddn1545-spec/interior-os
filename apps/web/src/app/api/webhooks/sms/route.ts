import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// NHN Cloud SMS 배달 결과 콜백
// NHN Cloud 콘솔 → SMS → 수신 통보 URL 에 등록: https://<domain>/api/webhooks/sms

interface NhnDeliveryCallback {
  requestId: string;
  resultCode: number;
  resultMessage: string;
  recipientNo: string;
  receiveDateTime: string;
}

export async function POST(req: NextRequest) {
  // 공개 엔드포인트 보호 — SMS_WEBHOOK_TOKEN이 설정돼 있으면 ?token= 일치 필수.
  // NHN 콘솔의 수신 통보 URL에 https://<domain>/api/webhooks/sms?token=<값> 으로 등록.
  const expectedToken = process.env.SMS_WEBHOOK_TOKEN;
  if (expectedToken) {
    const token = new URL(req.url).searchParams.get("token");
    if (token !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await req.json() as NhnDeliveryCallback | NhnDeliveryCallback[];
  const items = Array.isArray(body) ? body : [body];
  const supabase = createAdminClient();

  for (const item of items) {
    const isDelivered = item.resultCode === 0;
    await supabase
      .from("message_logs")
      .update({
        status: isDelivered ? "sent" : "failed",
      })
      .eq("provider_msg_id", item.requestId)
      .then(() => undefined, () => undefined);
  }

  return NextResponse.json({ ok: true });
}
