"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/get-tenant";
import { revalidatePath } from "next/cache";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface AttendanceBoardWorker {
  id: string;
  name: string;
  phone: string;
  dayRate: number;
  daysWorked: number;
  totalEarned: number;
  totalPaid: number;
  balance: number;
}

export interface WorkerSite {
  id: string;
  name: string;
}

/** YYYY-MM-01 ~ 다음달 1일 (이번달 범위) */
function monthRange(month?: string): { start: string; end: string; label: string } {
  const now = new Date();
  let year = now.getFullYear();
  let m = now.getMonth(); // 0-based
  if (month) {
    const [y, mm] = month.split("-").map(Number);
    if (y && mm) {
      year = y;
      m = mm - 1;
    }
  }
  const start = new Date(Date.UTC(year, m, 1));
  const end = new Date(Date.UTC(year, m + 1, 1));
  const toStr = (d: Date) => d.toISOString().split("T")[0];
  return {
    start: toStr(start),
    end: toStr(end),
    label: `${year}년 ${m + 1}월`,
  };
}

/** 현재(이번달) 기준 YYYY-MM 문자열 */
export async function getCurrentMonth(): Promise<string> {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function getCurrentMonthLabel(): Promise<string> {
  return monthRange().label;
}

/** 작업자별 이번달 출역 현황 */
export async function getWorkerAttendanceBoard(): Promise<ActionResult<AttendanceBoardWorker[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const { start, end } = monthRange();

  // 활성 작업자 목록
  const { data: workers, error: wErr } = await supabase
    .from("workers")
    .select("id, name, phone")
    .eq("is_active", true)
    .order("name");
  if (wErr) return { ok: false, error: wErr.message };

  // 이번달 출역 기록 — worker_attendance는 신규 테이블이라 생성 타입에 없음 → any 캐스트
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data: rows, error: aErr } = await db
    .from("worker_attendance")
    .select("worker_id, day_rate, paid_at, work_date")
    .gte("work_date", start)
    .lt("work_date", end);
  if (aErr) return { ok: false, error: aErr.message };

  type Agg = { daysWorked: number; totalEarned: number; totalPaid: number; lastRate: number };
  const byWorker = new Map<string, Agg>();
  for (const raw of (rows ?? []) as unknown[]) {
    const r = raw as Record<string, unknown>;
    const wid = r.worker_id as string;
    const rate = Number(r.day_rate ?? 0);
    const paid = r.paid_at != null;
    const agg = byWorker.get(wid) ?? { daysWorked: 0, totalEarned: 0, totalPaid: 0, lastRate: 0 };
    agg.daysWorked += 1;
    agg.totalEarned += rate;
    if (paid) agg.totalPaid += rate;
    agg.lastRate = rate;
    byWorker.set(wid, agg);
  }

  const board: AttendanceBoardWorker[] = ((workers ?? []) as unknown[]).map((raw) => {
    const w = raw as Record<string, unknown>;
    const id = w.id as string;
    const agg = byWorker.get(id);
    const daysWorked = agg?.daysWorked ?? 0;
    const totalEarned = agg?.totalEarned ?? 0;
    const totalPaid = agg?.totalPaid ?? 0;
    const dayRate = agg && agg.daysWorked > 0 ? agg.lastRate : 0;
    return {
      id,
      name: w.name as string,
      phone: (w.phone as string | null) ?? "",
      dayRate,
      daysWorked,
      totalEarned,
      totalPaid,
      balance: totalEarned - totalPaid,
    };
  });

  return { ok: true, data: board };
}

/** 출역 기록 — 중복(같은 작업자/현장/날짜)이면 무시 */
export async function recordAttendance(
  workerId: string,
  siteId: string,
  workDate: string,
  dayRate: number
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  if (!workerId || !siteId || !workDate) {
    return { ok: false, error: "작업자, 현장, 날짜를 확인해주세요" };
  }
  if (!dayRate || dayRate <= 0) {
    return { ok: false, error: "일당을 확인해주세요" };
  }

  const tenantId = await getTenantId(supabase, user);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { error } = await db
    .from("worker_attendance")
    .upsert(
      {
        tenant_id: tenantId,
        worker_id: workerId,
        site_id: siteId,
        work_date: workDate,
        day_rate: dayRate,
      },
      { onConflict: "worker_id,site_id,work_date", ignoreDuplicates: true }
    );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/workers/attendance");
  return { ok: true, data: undefined };
}

/** 해당 월 전체 출역을 정산 완료 처리 (paid_at = now) */
export async function markWorkerPaid(
  workerId: string,
  month: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const { start, end } = monthRange(month);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { error } = await db
    .from("worker_attendance")
    .update({ paid_at: new Date().toISOString() })
    .eq("worker_id", workerId)
    .is("paid_at", null)
    .gte("work_date", start)
    .lt("work_date", end);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/workers/attendance");
  return { ok: true, data: undefined };
}

/** 진행 중인 현장 목록 (작업자 배정용) */
export async function getWorkerSites(): Promise<ActionResult<WorkerSite[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const { data, error } = await supabase
    .from("sites")
    .select("id, name, status")
    .in("status", ["contracted", "in_progress"])
    .order("name");

  if (error) return { ok: false, error: error.message };

  const sites: WorkerSite[] = ((data ?? []) as unknown[]).map((raw) => {
    const r = raw as Record<string, unknown>;
    return { id: r.id as string, name: (r.name as string) ?? "현장" };
  });

  return { ok: true, data: sites };
}
