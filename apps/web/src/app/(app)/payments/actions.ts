"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/get-tenant";
import { revalidatePath } from "next/cache";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type Urgency = "overdue" | "soon" | "ok";

export interface PaymentBoardItem {
  id: string;
  siteId: string;
  quoteId: string | null;
  stage: "deposit" | "midterm" | "balance";
  stageLabel: string;
  amount: number;
  dueDate: string | null;
  memo: string | null;
  siteName: string;
  customerName: string;
  customerPhone: string;
  urgency: Urgency;
}

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function computeUrgency(dueDate: string | null): Urgency {
  if (!dueDate) return "ok";
  const today = startOfTodayUTC();
  const due = new Date(`${dueDate}T00:00:00Z`);
  if (due.getTime() < today.getTime()) return "overdue";
  const soonThreshold = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (due.getTime() <= soonThreshold.getTime()) return "soon";
  return "ok";
}

/** 잔금 보드 데이터 조회 — 미입금 스케줄을 약정일 빠른 순으로 */
export async function getPaymentBoard(): Promise<ActionResult<PaymentBoardItem[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  // payment_schedules는 신규 테이블이라 생성 타입에 없음 → any 캐스트 (finance_entries 패턴 동일)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data, error } = await db
    .from("payment_schedules")
    .select(
      "id, site_id, quote_id, stage, stage_label, amount, due_date, memo, sites(name, customer_id, customers(name, phone))"
    )
    .is("paid_at", null)
    .order("due_date", { ascending: true });

  if (error) return { ok: false, error: error.message };

  const items: PaymentBoardItem[] = ((data ?? []) as unknown[]).map((row) => {
    const r = row as unknown as Record<string, unknown>;
    const site = r.sites as
      | { name?: string; customers?: { name?: string; phone?: string } | null }
      | null;
    const customer = site?.customers ?? null;
    const dueDate = (r.due_date as string | null) ?? null;
    return {
      id: r.id as string,
      siteId: r.site_id as string,
      quoteId: (r.quote_id as string | null) ?? null,
      stage: r.stage as "deposit" | "midterm" | "balance",
      stageLabel: r.stage_label as string,
      amount: Number(r.amount ?? 0),
      dueDate,
      memo: (r.memo as string | null) ?? null,
      siteName: site?.name ?? "현장",
      customerName: customer?.name ?? "고객",
      customerPhone: customer?.phone ?? "",
      urgency: computeUrgency(dueDate),
    };
  });

  return { ok: true, data: items };
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** 결제 스케줄 생성 — 견적 확정 시 계약금30/중도금40/잔금30 자동 분할 */
export async function createPaymentSchedule(input: {
  siteId: string;
  quoteId: string;
  totalAmount: number;
  siteName: string;
}): Promise<ActionResult<{ count: number }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = await getTenantId(supabase, user);

  if (!input.siteId || !input.totalAmount || input.totalAmount <= 0) {
    return { ok: false, error: "현장과 총 금액이 필요합니다" };
  }

  const today = startOfTodayUTC();
  const addDays = (n: number) => toDateStr(new Date(today.getTime() + n * 24 * 60 * 60 * 1000));

  const deposit = Math.round(input.totalAmount * 0.3);
  const midterm = Math.round(input.totalAmount * 0.4);
  const balance = input.totalAmount - deposit - midterm; // 합계 보정

  const rows = [
    {
      tenant_id: tenantId,
      site_id: input.siteId,
      quote_id: input.quoteId || null,
      stage: "deposit",
      stage_label: "계약금",
      amount: deposit,
      due_date: addDays(3),
    },
    {
      tenant_id: tenantId,
      site_id: input.siteId,
      quote_id: input.quoteId || null,
      stage: "midterm",
      stage_label: "중도금",
      amount: midterm,
      due_date: addDays(14),
    },
    {
      tenant_id: tenantId,
      site_id: input.siteId,
      quote_id: input.quoteId || null,
      stage: "balance",
      stage_label: "잔금",
      amount: balance,
      due_date: addDays(30),
    },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("payment_schedules").insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/payments");
  return { ok: true, data: { count: rows.length } };
}

/** 입금 확인 처리 */
export async function markPaid(
  scheduleId: string,
  paidAmount: number
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("payment_schedules")
    .update({ paid_at: new Date().toISOString(), paid_amount: paidAmount })
    .eq("id", scheduleId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/payments");
  return { ok: true, data: undefined };
}

/** 독촉 문자 발송 — message_logs 직접 기록 (고객 템플릿 코드 없으므로 SMS API 미호출) */
export async function sendPaymentReminder(
  scheduleId: string,
  tone: "polite" | "firm" | "final"
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = await getTenantId(supabase, user);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: schedule } = await (supabase as any)
    .from("payment_schedules")
    .select(
      "id, site_id, stage_label, amount, sites(name, customer_id, customers(id, name, phone))"
    )
    .eq("id", scheduleId)
    .single();

  if (!schedule) return { ok: false, error: "결제 스케줄을 찾을 수 없습니다" };

  const s = schedule as unknown as Record<string, unknown>;
  const site = s.sites as
    | {
        name?: string;
        customer_id?: string;
        customers?: { id?: string; name?: string; phone?: string } | null;
      }
    | null;
  const customer = site?.customers ?? null;

  const customerId = customer?.id ?? site?.customer_id;
  if (!customerId) return { ok: false, error: "고객 정보를 찾을 수 없습니다" };

  const customerName = customer?.name ?? "고객";
  const siteName = site?.name ?? "현장";
  const stageLabel = s.stage_label as string;
  const amount = Number(s.amount ?? 0);
  const amountStr = amount.toLocaleString("ko-KR");

  let body = "";
  if (tone === "polite") {
    body = `${customerName}님, 안녕하세요. ${siteName} 관련 ${stageLabel} ${amountStr}원 입금 부탁드립니다 🙏 계좌번호는 말씀드리면 바로 알려드릴게요.`;
  } else if (tone === "firm") {
    body = `${customerName}님, ${siteName} ${stageLabel} ${amountStr}원이 미입금 상태입니다. 빠른 처리 부탁드립니다.`;
  } else {
    body = `${customerName}님, ${siteName} 미수금 ${amountStr}원 관련 연락 주시기 바랍니다. 미입금 지속 시 법적 조치가 필요할 수 있습니다.`;
  }

  const insertData = {
    tenant_id: tenantId,
    target_type: "customer",
    target_id: customerId,
    site_id: s.site_id as string,
    channel: "sms",
    body_masked: body,
    status: "queued",
    idempotency_key: `payment-reminder-${scheduleId}-${tone}-${Date.now()}`,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("message_logs") as any).insert(insertData);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/payments");
  return { ok: true, data: undefined };
}
