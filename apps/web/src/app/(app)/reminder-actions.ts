"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { formatKoreanDate } from "@/lib/sms/templates";
import { sendMessage } from "./messages/actions";
import type { ActionResult } from "./quotes/new/actions";

// 내일 시작하는 작업의 작업자 리마인드 — 노쇼 방지의 핵심.
// 발송은 사장님이 홈에서 버튼을 눌러야 나간다 (사람 확정 게이트).

export interface TomorrowReminder {
  taskId: string;
  siteId: string;
  siteName: string;
  taskTitle: string;
  tradeId: string | null;
  workerId: string | null;
  workerName: string | null;
  workerPhone: string | null;
  /** 이미 리마인드 문자를 보냈는지 */
  reminded: boolean;
}

function kstTomorrowStr(): string {
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const tomorrow = new Date(
    Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate() + 1)
  );
  return tomorrow.toISOString().split("T")[0];
}

function reminderKey(taskId: string, dateStr: string): string {
  return `worker-remind-${taskId}-${dateStr}`;
}

type MaybeArray<T> = T | T[] | null | undefined;
function first<T>(v: MaybeArray<T>): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/** 내일 시작하는 작업 + 배정 작업자 목록 */
export async function getTomorrowWorkerReminders(): Promise<ActionResult<TomorrowReminder[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tomorrowStr = kstTomorrowStr();

  type TaskRow = {
    id: string;
    title: string;
    site_id: string;
    trade_id: string | null;
    assignment_id: string | null;
    sites: MaybeArray<{ name?: string }>;
  };

  const { data: tasks, error } = await supabase
    .from("schedule_tasks")
    .select("id, title, site_id, trade_id, assignment_id, sites(name)")
    .eq("start_date", tomorrowStr)
    .in("status", ["planned", "active"])
    .eq("kind", "work")
    .limit(20);

  if (error) return { ok: false, error: error.message };

  const taskRows = (tasks ?? []) as unknown as TaskRow[];
  if (taskRows.length === 0) return { ok: true, data: [] };

  // 배정 조회 — assignment_id 직접 연결 우선, 없으면 (현장, 공종) 매칭 폴백
  const siteIds = [...new Set(taskRows.map((t) => t.site_id))];
  type AssignmentRow = {
    id: string;
    site_id: string;
    trade_id: string;
    worker_id: string;
    workers: MaybeArray<{ id?: string; name?: string; phone?: string }>;
  };
  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, site_id, trade_id, worker_id, workers(id, name, phone)")
    .in("site_id", siteIds)
    .neq("status", "declined");

  const assignmentRows = (assignments ?? []) as unknown as AssignmentRow[];
  const byId = new Map(assignmentRows.map((a) => [a.id, a]));
  const bySiteTrade = new Map(assignmentRows.map((a) => [`${a.site_id}:${a.trade_id}`, a]));

  // 이미 보낸 리마인드 확인
  const keys = taskRows.map((t) => reminderKey(t.id, tomorrowStr));
  const { data: logs } = await supabase
    .from("message_logs")
    .select("idempotency_key, status")
    .in("idempotency_key", keys);
  const sentKeys = new Set(
    ((logs ?? []) as { idempotency_key: string; status: string }[])
      .filter((l) => l.status === "sent" || l.status === "queued")
      .map((l) => l.idempotency_key)
  );

  const items: TomorrowReminder[] = taskRows.map((t) => {
    const assignment =
      (t.assignment_id ? byId.get(t.assignment_id) : undefined) ??
      (t.trade_id ? bySiteTrade.get(`${t.site_id}:${t.trade_id}`) : undefined) ??
      null;
    const worker = assignment ? first(assignment.workers) : null;
    return {
      taskId: t.id,
      siteId: t.site_id,
      siteName: first(t.sites)?.name ?? "현장",
      taskTitle: t.title,
      tradeId: t.trade_id,
      workerId: assignment?.worker_id ?? worker?.id ?? null,
      workerName: worker?.name ?? null,
      workerPhone: worker?.phone ?? null,
      reminded: sentKeys.has(reminderKey(t.id, tomorrowStr)),
    };
  });

  return { ok: true, data: items };
}

/**
 * 작업자 리마인드 발송 — 본문·수신번호는 sendMessage가 서버에서 재생성.
 * 멱등 키(작업+날짜)로 같은 작업에 대한 중복 발송을 차단한다.
 */
export async function sendWorkerReminder(taskId: string): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tomorrowStr = kstTomorrowStr();

  // 클라이언트 입력을 신뢰하지 않고 작업을 다시 조회
  const { data: task } = await supabase
    .from("schedule_tasks")
    .select("id, title, site_id, trade_id, assignment_id, start_date")
    .eq("id", taskId)
    .maybeSingle();

  const t = task as unknown as {
    id: string;
    site_id: string;
    trade_id: string | null;
    assignment_id: string | null;
    start_date: string | null;
  } | null;
  if (!t) return { ok: false, error: "작업을 찾을 수 없습니다" };
  if (t.start_date !== tomorrowStr) {
    return { ok: false, error: "내일 시작하는 작업만 리마인드를 보낼 수 있어요" };
  }

  // 배정 작업자 찾기 (직접 연결 → 현장·공종 매칭 폴백)
  let workerId: string | null = null;
  if (t.assignment_id) {
    const { data: a } = await supabase
      .from("assignments")
      .select("worker_id")
      .eq("id", t.assignment_id)
      .maybeSingle();
    workerId = (a as { worker_id?: string } | null)?.worker_id ?? null;
  }
  if (!workerId && t.trade_id) {
    const { data: a } = await supabase
      .from("assignments")
      .select("worker_id")
      .eq("site_id", t.site_id)
      .eq("trade_id", t.trade_id)
      .neq("status", "declined")
      .limit(1)
      .maybeSingle();
    workerId = (a as { worker_id?: string } | null)?.worker_id ?? null;
  }
  if (!workerId) return { ok: false, error: "이 작업에 배정된 작업자가 없어요" };

  const result = await sendMessage({
    targetType: "worker",
    targetId: workerId,
    siteId: t.site_id,
    messageType: "worker_notify",
    workDate: formatKoreanDate(tomorrowStr),
    tradeId: t.trade_id ?? undefined,
    channel: "sms",
    idempotencyKey: reminderKey(t.id, tomorrowStr),
  });

  if (!result.ok) return result;

  revalidatePath("/");
  return { ok: true, data: undefined };
}
