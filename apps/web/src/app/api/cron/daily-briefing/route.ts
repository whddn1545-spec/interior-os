import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms/nhn";
import {
  composeBriefing,
  type BriefingTask,
  type BriefingPayment,
} from "@interior-os/core/briefing";

// 매일 아침 사장님에게 SMS 브리핑: 오늘 공사 / 받을 돈 / 답 없는 견적.
// 본문 조립은 @interior-os/core의 순수 함수(composeBriefing)가 담당하고,
// 이 라우트는 데이터 수집·발송·멱등 기록만 한다.

const STALE_QUOTE_DAYS = 3;
const PAYMENT_SOON_DAYS = 3;

/** KST 기준 자정 Date (UTC+9) */
function kstToday(): Date {
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()));
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function kstDateLabel(d: Date): string {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${days[d.getUTCDay()]})`;
}

// Supabase 조인 결과는 관계 정의에 따라 객체 또는 배열로 올 수 있어 둘 다 수용
type MaybeArray<T> = T | T[] | null | undefined;

function first<T>(v: MaybeArray<T>): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

type TaskRow = {
  title: string;
  sites: MaybeArray<{ name?: string }>;
  assignments: MaybeArray<{ workers: MaybeArray<{ name?: string }> }>;
};

type PaymentRow = {
  stage_label: string;
  amount: number;
  due_date: string | null;
  sites: MaybeArray<{ name?: string }>;
};

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = kstToday();
  const todayStr = toDateStr(today);
  const soonStr = toDateStr(new Date(today.getTime() + PAYMENT_SOON_DAYS * 24 * 60 * 60 * 1000));
  const staleBefore = new Date(today.getTime() - STALE_QUOTE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const dateLabel = kstDateLabel(today);

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, owner_phone, briefing_enabled");

  let totalSent = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const tenant of tenants ?? []) {
    const t = tenant as unknown as { id: string; owner_phone: string | null; briefing_enabled: boolean | null };
    if (!t.owner_phone || t.briefing_enabled === false) {
      totalSkipped++;
      continue;
    }

    const [tasksRes, paymentsRes, staleQuotesRes] = await Promise.all([
      supabase
        .from("schedule_tasks")
        .select("title, sites(name), assignments(workers(name))")
        .eq("tenant_id", t.id)
        .lte("start_date", todayStr)
        .gte("end_date", todayStr)
        .neq("status", "canceled")
        .limit(20),
      supabase
        .from("payment_schedules")
        .select("stage_label, amount, due_date, sites(name)")
        .eq("tenant_id", t.id)
        .is("paid_at", null)
        .lte("due_date", soonStr)
        .order("due_date", { ascending: true })
        .limit(20),
      supabase
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", t.id)
        .eq("status", "sent")
        .lt("updated_at", staleBefore),
    ]);

    const tasks: BriefingTask[] = ((tasksRes.data ?? []) as unknown as TaskRow[]).map((row) => {
      const assignments = Array.isArray(row.assignments)
        ? row.assignments
        : row.assignments
          ? [row.assignments]
          : [];
      return {
        siteName: first(row.sites)?.name ?? "현장",
        title: row.title,
        workerNames: assignments
          .map((a) => first(a.workers)?.name)
          .filter((n): n is string => Boolean(n)),
      };
    });

    const payments: BriefingPayment[] = ((paymentsRes.data ?? []) as unknown as PaymentRow[]).map((row) => {
      const due = row.due_date ? new Date(`${row.due_date}T00:00:00Z`) : today;
      const overdueDays = Math.round((today.getTime() - due.getTime()) / (24 * 60 * 60 * 1000));
      return {
        siteName: first(row.sites)?.name ?? "현장",
        stageLabel: row.stage_label,
        amount: Number(row.amount ?? 0),
        overdueDays,
      };
    });

    const body = composeBriefing({
      dateLabel,
      tasks,
      payments,
      staleQuoteCount: staleQuotesRes.count ?? 0,
    });

    if (!body) {
      totalSkipped++;
      continue;
    }

    // 멱등 기록 — insert 후 충돌 시 기존 행을 조회. 이미 sent면 재발송하지 않는다.
    // (upsert로 덮어쓰면 기존 sent 상태가 queued로 되돌아가므로 사용하지 않음)
    const idempotencyKey = `brief_${todayStr}_${t.id}`;
    const { data: inserted } = await supabase
      .from("message_logs")
      .upsert(
        {
          tenant_id: t.id,
          target_type: "owner",
          target_id: t.id,
          channel: "sms",
          body_masked: body,
          status: "queued",
          idempotency_key: idempotencyKey,
        },
        { onConflict: "idempotency_key", ignoreDuplicates: true }
      )
      .select("id, status")
      .maybeSingle();

    let logRow = inserted as unknown as { id: string; status: string } | null;
    if (!logRow) {
      // 충돌 → 기존 행 조회 (재실행 케이스)
      const { data: existing } = await supabase
        .from("message_logs")
        .select("id, status")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      logRow = existing as unknown as { id: string; status: string } | null;
    }

    if (logRow?.status === "sent") {
      totalSkipped++;
      continue;
    }

    const result = await sendSms({
      to: t.owner_phone,
      body,
      idempotencyKey,
    });

    if (logRow?.id) {
      await supabase
        .from("message_logs")
        .update({
          status: result.success ? "sent" : "failed",
          provider_msg_id: result.providerMsgId ?? null,
          sent_at: result.success ? new Date().toISOString() : null,
        })
        .eq("id", logRow.id);
    }

    if (result.success) totalSent++;
    else totalFailed++;
  }

  return NextResponse.json({ ok: true, date: todayStr, totalSent, totalSkipped, totalFailed });
}
