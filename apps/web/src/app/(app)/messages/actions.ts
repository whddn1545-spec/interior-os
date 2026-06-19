"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "../quotes/new/actions";

export interface MessagePreviewResult {
  body: string;
  maskedBody: string;
  targetName: string;
  targetPhone: string;
}

/** 문자 미리보기 생성 */
export async function previewMessage(input: {
  targetType: "customer" | "worker";
  targetId: string;
  siteId: string;
  messageType: "worker_notify" | "customer_progress" | "custom";
  customBody?: string;
  workDate?: string;
  tradeId?: string;
}): Promise<ActionResult<MessagePreviewResult>> {
  const supabase = await createClient();

  // 현장 정보
  const { data: site } = await supabase
    .from("sites")
    .select("name, address, main_door_code, unit_door_code")
    .eq("id", input.siteId)
    .single();

  if (!site) return { ok: false, error: "현장을 찾을 수 없습니다" };
  const siteAny = site as unknown as Record<string, unknown>;

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

  let body = "";
  let maskedBody = "";

  if (input.messageType === "worker_notify") {
    const mainDoor = siteAny.main_door_code as string | null;
    const unitDoor = siteAny.unit_door_code as string | null;
    const dateStr = input.workDate
      ? new Date(input.workDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })
      : "미정";

    const codeSection = [
      mainDoor ? `공동현관: ${mainDoor}` : null,
      unitDoor ? `세대현관: ${unitDoor}` : null,
    ].filter(Boolean).join("\n");

    const maskedCodeSection = [
      mainDoor ? `공동현관: ****` : null,
      unitDoor ? `세대현관: ****` : null,
    ].filter(Boolean).join("\n");

    body = `${targetName}님, ${dateStr} ${siteAny.name as string} ${tradeName} 작업 부탁드립니다.\n주소: ${siteAny.address as string}${codeSection ? `\n${codeSection}` : ""}\n감사합니다.`;
    maskedBody = `${targetName}님, ${dateStr} ${siteAny.name as string} ${tradeName} 작업 부탁드립니다.\n주소: ${siteAny.address as string}${maskedCodeSection ? `\n${maskedCodeSection}` : ""}\n감사합니다.`;

  } else if (input.messageType === "customer_progress") {
    body = `${targetName}님, ${siteAny.name as string} 공사가 순조롭게 진행 중입니다. 궁금하신 점은 언제든 연락주세요.`;
    maskedBody = body;

  } else {
    body = input.customBody ?? "";
    maskedBody = body;
  }

  return { ok: true, data: { body, maskedBody, targetName, targetPhone } };
}

/** 문자 발송 */
export async function sendMessage(input: {
  targetType: "customer" | "worker";
  targetId: string;
  siteId?: string;
  body: string;
  maskedBody: string;
  channel: "sms" | "alimtalk";
  idempotencyKey: string;
  targetPhone: string;
}): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = user.user_metadata.tenant_id ?? user.id;

  // 중복 발송 확인
  const { data: existing } = await supabase
    .from("message_logs")
    .select("id, status")
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();

  if (existing && (existing as unknown as { status: string }).status === "sent") {
    return { ok: false, error: "이미 발송된 메시지입니다" };
  }

  // 로그 기록 (queued)
  const { data: log, error: logError } = await supabase
    .from("message_logs")
    .upsert({
      tenant_id: tenantId,
      target_type: input.targetType,
      target_id: input.targetId,
      site_id: input.siteId ?? null,
      channel: input.channel,
      body_masked: input.maskedBody,
      status: "queued" as const,
      idempotency_key: input.idempotencyKey,
    }, { onConflict: "idempotency_key" })
    .select("id")
    .single();

  if (logError) return { ok: false, error: logError.message };
  const logId = (log as unknown as { id: string }).id;

  // NHN SMS 발송
  try {
    const { sendSms } = await import("@/lib/sms/nhn");
    const result = await sendSms({
      to: input.targetPhone,
      body: input.body,
      idempotencyKey: input.idempotencyKey,
    });

    await supabase
      .from("message_logs")
      .update({
        status: result.success ? "sent" as const : "failed" as const,
        provider_msg_id: result.providerMsgId ?? null,
        sent_at: result.success ? new Date().toISOString() : null,
      })
      .eq("id", logId);

    if (!result.success) {
      return { ok: false, error: result.errorMessage ?? "발송 실패" };
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
export async function getActiveSites(): Promise<ActionResult<{ id: string; name: string; trades: { id: string; name_ko: string }[] }[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sites")
    .select("id, name, schedule_tasks(trade_id, trades(id, name_ko))")
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
        trades: Array.from(tradeMap.entries()).map(([id, name_ko]) => ({ id, name_ko })),
      };
    }),
  };
}
