"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/get-tenant";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "../quotes/new/actions";
import {
  buildWorkerNotifyMessage,
  buildCustomerProgressMessage,
  buildPaymentRequestMessage,
  buildWorkDoneMessage,
  formatKoreanDate,
} from "@/lib/sms/templates";

export type MessageType =
  | "worker_notify"
  | "customer_progress"
  | "payment_request"
  | "work_done"
  | "custom";

/** 대금 청구 단계 */
export type PaymentStage = "deposit" | "midterm" | "balance";
/** 공사 완료/하자보수 구분 */
export type WorkDoneVariant = "completed" | "warranty";

export interface MessagePreviewResult {
  body: string;
  maskedBody: string;
  targetName: string;
  targetPhone: string;
}

export interface PreviewMessageInput {
  targetType: "customer" | "worker";
  targetId: string;
  siteId: string;
  messageType: MessageType;
  customBody?: string;
  workDate?: string;
  tradeId?: string;
  paymentStage?: PaymentStage;
  workDoneVariant?: WorkDoneVariant;
}

/** 문자 종류 검증 (서버측) */
function isValidMessageType(t: unknown): t is MessageType {
  return (
    t === "worker_notify" ||
    t === "customer_progress" ||
    t === "payment_request" ||
    t === "work_done" ||
    t === "custom"
  );
}

/** tenants.default_settings(jsonb) 에서 입금 계좌 문자열을 안전하게 꺼낸다. */
function extractBankAccount(settings: unknown): string | null {
  if (!settings || typeof settings !== "object") return null;
  const s = settings as Record<string, unknown>;
  const raw = s.bank_account ?? s.bankAccount;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return null;
}

/** 문자 미리보기 생성 — 본문은 lib/sms/templates.ts 빌더 함수가 단일 출처다. */
export async function previewMessage(
  input: PreviewMessageInput
): Promise<ActionResult<MessagePreviewResult>> {
  const supabase = await createClient();

  if (!isValidMessageType(input.messageType)) {
    return { ok: false, error: "문자 종류가 올바르지 않습니다" };
  }

  // 현장 정보
  const { data: site } = await supabase
    .from("sites")
    .select("name, address, main_door_code, unit_door_code")
    .eq("id", input.siteId)
    .single();

  if (!site) return { ok: false, error: "현장을 찾을 수 없습니다" };
  const siteAny = site as unknown as {
    name: string;
    address: string;
    main_door_code: string | null;
    unit_door_code: string | null;
  };

  let targetName = "";
  let targetPhone = "";

  if (input.targetType === "worker") {
    const { data: worker } = await supabase
      .from("workers")
      .select("name, phone")
      .eq("id", input.targetId)
      .single();
    if (!worker) return { ok: false, error: "작업자를 찾을 수 없습니다" };
    const w = worker as unknown as { name: string; phone: string };
    targetName = w.name;
    targetPhone = w.phone;
  } else {
    const { data: customer } = await supabase
      .from("customers")
      .select("name, phone")
      .eq("id", input.targetId)
      .single();
    if (!customer) return { ok: false, error: "고객을 찾을 수 없습니다" };
    const c = customer as unknown as { name: string; phone: string };
    targetName = c.name;
    targetPhone = c.phone;
  }

  let tradeName = "";
  if (input.tradeId) {
    const { data: trade } = await supabase
      .from("trades")
      .select("name_ko")
      .eq("id", input.tradeId)
      .single();
    if (trade) tradeName = (trade as unknown as { name_ko: string }).name_ko;
  }

  const dateStr = formatKoreanDate(input.workDate);

  let body = "";
  let maskedBody = "";

  if (input.messageType === "worker_notify") {
    const built = buildWorkerNotifyMessage({
      workerName: targetName,
      siteName: siteAny.name,
      siteAddress: siteAny.address,
      workDate: dateStr || "작업일 미정",
      tradeName,
      mainDoorCode: siteAny.main_door_code,
      unitDoorCode: siteAny.unit_door_code,
    });
    body = built.body;
    maskedBody = built.maskedBody;
  } else if (input.messageType === "customer_progress") {
    const built = buildCustomerProgressMessage({
      customerName: targetName,
      siteName: siteAny.name,
      tradeName: tradeName || undefined,
      scheduledDate: dateStr || undefined,
    });
    body = built.body;
    maskedBody = built.maskedBody;
  } else if (input.messageType === "payment_request") {
    // 대금 청구: payment_schedules(미수)·tenants 계좌 조회
    const stage = input.paymentStage ?? "deposit";
    const { data: schedule } = await supabase
      .from("payment_schedules")
      .select("stage_label, amount, due_date")
      .eq("site_id", input.siteId)
      .eq("stage", stage)
      .is("paid_at", null)
      .order("due_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!schedule) {
      return {
        ok: false,
        error: "해당 단계의 미수 대금이 없습니다. 잔금 보드에서 확인해주세요.",
      };
    }
    const sch = schedule as unknown as {
      stage_label: string;
      amount: number | string;
      due_date: string | null;
    };

    // 사업자 입금 계좌 (tenants.default_settings)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let bankAccount: string | null = null;
    if (user) {
      const tenantId = await getTenantId(supabase, user);
      const { data: tenant } = await supabase
        .from("tenants")
        .select("default_settings")
        .eq("id", tenantId)
        .maybeSingle();
      bankAccount = extractBankAccount(
        (tenant as unknown as { default_settings: unknown } | null)
          ?.default_settings
      );
    }

    const built = buildPaymentRequestMessage({
      customerName: targetName,
      siteName: siteAny.name,
      stageLabel: sch.stage_label,
      amount: Number(sch.amount ?? 0),
      dueDate: formatKoreanDate(sch.due_date) || undefined,
      bankAccount,
    });
    body = built.body;
    maskedBody = built.maskedBody;
  } else if (input.messageType === "work_done") {
    const variant: WorkDoneVariant =
      input.workDoneVariant === "warranty" ? "warranty" : "completed";
    const built = buildWorkDoneMessage({
      customerName: targetName,
      siteName: siteAny.name,
      variant,
      tradeName: tradeName || undefined,
      scheduledDate: dateStr || undefined,
    });
    body = built.body;
    maskedBody = built.maskedBody;
  } else {
    body = input.customBody ?? "";
    maskedBody = body;
  }

  return { ok: true, data: { body, maskedBody, targetName, targetPhone } };
}

/** 문자 발송 — body/phone은 서버에서 재생성 (클라이언트 변조 방지) */
export async function sendMessage(input: {
  targetType: "customer" | "worker";
  targetId: string;
  siteId?: string;
  messageType: MessageType;
  customBody?: string;
  workDate?: string;
  tradeId?: string;
  paymentStage?: PaymentStage;
  workDoneVariant?: WorkDoneVariant;
  channel: "sms" | "alimtalk";
  idempotencyKey: string;
}): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  if (!isValidMessageType(input.messageType)) {
    return { ok: false, error: "문자 종류가 올바르지 않습니다" };
  }

  const tenantId = await getTenantId(supabase, user);

  // 서버에서 본문·수신번호 직접 생성 (클라이언트 입력 신뢰 안 함)
  const previewResult = await previewMessage({
    targetType: input.targetType,
    targetId: input.targetId,
    siteId: input.siteId ?? "",
    messageType: input.messageType,
    customBody: input.customBody,
    workDate: input.workDate,
    tradeId: input.tradeId,
    paymentStage: input.paymentStage,
    workDoneVariant: input.workDoneVariant,
  });
  if (!previewResult.ok || !previewResult.data) {
    return { ok: false, error: (!previewResult.ok ? (previewResult as { ok: false; error?: string }).error : undefined) ?? "메시지 생성 실패" };
  }
  const { body, maskedBody, targetPhone } = previewResult.data;

  // 중복 발송 확인 (이미 발송 완료/대기 중이면 차단)
  const { data: existing } = await supabase
    .from("message_logs")
    .select("id, status")
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();

  if (existing) {
    const status = (existing as unknown as { status: string }).status;
    // sent: 이미 발송 완료, queued: 동시 요청(더블탭)으로 발송 진행 중
    if (status === "sent" || status === "queued") {
      return { ok: false, error: "이미 발송되었거나 발송 중인 메시지입니다" };
    }
  }

  // 로그 기록 (queued). idempotency_key 유니크 제약으로 동시 삽입은 한쪽만 성공한다.
  const { data: log, error: logError } = await supabase
    .from("message_logs")
    .insert({
      tenant_id: tenantId,
      target_type: input.targetType,
      target_id: input.targetId,
      site_id: input.siteId ?? null,
      channel: input.channel,
      body_masked: maskedBody,
      status: "queued" as const,
      idempotency_key: input.idempotencyKey,
    })
    .select("id")
    .single();

  if (logError) {
    // 유니크 제약 위반 = 동시 요청에서 다른 쪽이 이미 큐에 넣음 → 중복으로 처리
    if (logError.code === "23505") {
      return { ok: false, error: "이미 발송되었거나 발송 중인 메시지입니다" };
    }
    return { ok: false, error: logError.message };
  }
  const logId = (log as unknown as { id: string }).id;

  // NHN SMS 발송
  try {
    const { sendSms } = await import("@/lib/sms/nhn");
    const result = await sendSms({
      to: targetPhone,
      body: body,
      idempotencyKey: input.idempotencyKey,
    });

    // sendResultList 개별 resultCode까지 확인 (접수 성공 ≠ 단말 도달)
    const delivered = result.success && result.providerMsgId != null;

    await supabase
      .from("message_logs")
      .update({
        status: delivered ? "sent" as const : "failed" as const,
        provider_msg_id: result.providerMsgId ?? null,
        sent_at: delivered ? new Date().toISOString() : null,
      })
      .eq("id", logId);

    if (!delivered) {
      return { ok: false, error: result.errorMessage ?? "발송에 실패했어요. 수신자 번호를 확인해주세요." };
    }
  } catch (e) {
    await supabase
      .from("message_logs")
      .update({ status: "failed" as const })
      .eq("id", logId);
    return { ok: false, error: e instanceof Error ? e.message : "발송 중 오류가 발생했습니다" };
  }

  revalidatePath("/messages");
  return { ok: true, data: undefined };
}

/** 문자 발송 대상 목록 (작업자 목록) */
export async function getWorkers(): Promise<ActionResult<{ id: string; name: string; phone: string; tradesKo: string }[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workers")
    .select("id, name, phone, worker_trades(trades(name_ko))")
    .eq("is_active", true)
    .order("name");

  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    data: (data ?? []).map((w) => {
      const wAny = w as unknown as Record<string, unknown>;
      const wts = (wAny.worker_trades as { trades: { name_ko: string } | null }[] | null) ?? [];
      return {
        id: wAny.id as string,
        name: wAny.name as string,
        phone: wAny.phone as string,
        tradesKo: wts.map((wt) => wt.trades?.name_ko ?? "").filter(Boolean).join(", "),
      };
    }),
  };
}

/** 진행 중인 현장 목록 */
export async function getActiveSites(): Promise<ActionResult<{ id: string; name: string; customerId: string | null; trades: { id: string; name_ko: string }[] }[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sites")
    .select("id, name, customer_id, schedule_tasks(trade_id, trades(id, name_ko))")
    .in("status", ["contracted", "in_progress"])
    .order("name");

  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    data: (data ?? []).map((s) => {
      const sAny = s as unknown as Record<string, unknown>;
      const tasks = (sAny.schedule_tasks as { trade_id: string | null; trades: { id: string; name_ko: string } | null }[] | null) ?? [];
      const tradeMap = new Map<string, string>();
      for (const t of tasks) {
        if (t.trades) tradeMap.set(t.trades.id, t.trades.name_ko);
      }
      return {
        id: sAny.id as string,
        name: sAny.name as string,
        customerId: (sAny.customer_id as string | null) ?? null,
        trades: Array.from(tradeMap.entries()).map(([id, name_ko]) => ({ id, name_ko })),
      };
    }),
  };
}

/** 문자 발송 대상 목록 (고객 목록) */
export async function getCustomers(): Promise<ActionResult<{ id: string; name: string; phone: string }[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone")
    .order("name");

  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    data: (data ?? []).map((c) => {
      const cAny = c as unknown as Record<string, unknown>;
      return {
        id: cAny.id as string,
        name: cAny.name as string,
        phone: cAny.phone as string,
      };
    }),
  };
}
