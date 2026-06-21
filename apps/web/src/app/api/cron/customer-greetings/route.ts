import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/sms/nhn";

const SEASON_MESSAGES: Record<string, string> = {
  "01-01": "새해 복 많이 받으세요! 올 한 해도 행복한 공간에서 지내시길 바랍니다. — {COMPANY}",
  "02-14": "설 명절 잘 보내세요! 가족과 따뜻한 시간 되세요. — {COMPANY}",
  "05-05": "어린이날 즐거운 황금연휴 보내세요! 항상 건강하세요. — {COMPANY}",
  "09-15": "추석 명절 잘 보내세요! 가족들과 행복한 연휴 되세요. — {COMPANY}",
  "12-25": "메리 크리스마스! 행복하고 따뜻한 연말 보내세요. — {COMPANY}",
  "12-31": "한 해 동안 감사드렸습니다. 새해에도 건강하세요! — {COMPANY}",
};

function getTodayKey(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayKey = getTodayKey();
  const messageTemplate = SEASON_MESSAGES[todayKey];
  if (!messageTemplate) {
    return NextResponse.json({ skipped: true, reason: "not a greeting day", date: todayKey });
  }

  const supabase = await createClient();
  const { data: tenants } = await supabase.from("tenants").select("id, name");
  if (!tenants || tenants.length === 0) return NextResponse.json({ sent: 0 });

  let totalSent = 0;
  let totalFailed = 0;

  for (const tenant of tenants) {
    const tenantAny = tenant as unknown as Record<string, unknown>;
    const tenantId = tenantAny.id as string;
    const companyName = (tenantAny.name as string | null) ?? "인테리어";
    const body = messageTemplate.replace("{COMPANY}", companyName);

    const { data: customers } = await supabase
      .from("customers")
      .select("id, phone")
      .eq("tenant_id", tenantId)
      .neq("grade", "dormant");

    if (!customers) continue;

    for (const customer of customers) {
      const cAny = customer as unknown as Record<string, unknown>;
      const customerId = cAny.id as string;
      const idempotencyKey = `greet_${todayKey}_${customerId}`;
      const maskedBody = body.replace(/\d{3,4}/g, "***");

      // 로그 삽입 (queued)
      const { data: log } = await supabase
        .from("message_logs")
        .upsert({
          tenant_id: tenantId,
          target_type: "customer",
          target_id: customerId,
          channel: "sms",
          body_masked: maskedBody,
          status: "queued",
          idempotency_key: idempotencyKey,
        }, { onConflict: "idempotency_key" })
        .select("id")
        .single();

      const logId = (log as unknown as { id: string } | null)?.id;

      const result = await sendSms({
        to: cAny.phone as string,
        body,
        idempotencyKey,
      });

      if (logId) {
        await supabase
          .from("message_logs")
          .update({
            status: result.success ? "sent" : "failed",
            provider_msg_id: result.providerMsgId ?? null,
            sent_at: result.success ? new Date().toISOString() : null,
          })
          .eq("id", logId);
      }

      if (result.success) totalSent++;
      else totalFailed++;
    }
  }

  return NextResponse.json({ ok: true, date: todayKey, totalSent, totalFailed });
}
