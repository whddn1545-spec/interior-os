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
