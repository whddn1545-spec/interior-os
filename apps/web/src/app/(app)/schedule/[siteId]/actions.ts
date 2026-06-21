"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { calcSchedule, offsetToDate } from "@interior-os/core/pricing";
import type { ScheduleItemInput } from "@interior-os/core/pricing";
import type { ActionResult } from "../../quotes/new/actions";

/** 견적에서 일정 자동 생성 */
export async function generateScheduleFromQuote(
  siteId: string,
  quoteId: string,
  startDate: string
): Promise<ActionResult<{ count: number }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = user.user_metadata.tenant_id ?? user.id;

  // 견적 항목 + 공종 정보 가져오기
  const { data: items } = await supabase
    .from("quote_items")
    .select("trade_id, description, labor_days, trades(name_ko, code)")
    .eq("quote_id", quoteId);

  if (!items || items.length === 0) {
    return { ok: false, error: "견적 항목이 없습니다" };
  }

  // 공종별 선후행 관계 (인테리어 표준 순서)
  const TRADE_DEPS: Record<string, string[]> = {
    demolition: [],
    electric: ["demolition"],
    plumbing: ["demolition"],
    carpentry: ["electric", "plumbing"],
    tile: ["plumbing"],
    flooring: ["carpentry", "tile"],
    wallpaper: ["flooring"],
    paint: ["carpentry"],
    film: ["wallpaper"],
    window: [],
    bathroom: ["plumbing", "tile"],
    kitchen: ["electric", "carpentry"],
  };

  // 공종 코드 → 이름 맵
  const tradeItems = new Map<string, { tradeId: string; nameKo: string; code: string; totalDays: number }>();
  for (const item of items) {
    const itemAny = item as unknown as Record<string, unknown>;
    const trade = itemAny.trades as { name_ko: string; code: string } | null;
    const tradeId = itemAny.trade_id as string;
    const existing = tradeItems.get(tradeId);
    if (existing) {
      existing.totalDays += (itemAny.labor_days as number) ?? 0;
    } else {
      tradeItems.set(tradeId, {
        tradeId,
        nameKo: trade?.name_ko ?? "",
        code: trade?.code ?? "",
        totalDays: (itemAny.labor_days as number) ?? 1,
      });
    }
  }

  // tradeId → code 맵 (선후행 연결용)
  const codeToTradeId = new Map<string, string>();
  for (const [tradeId, { code }] of tradeItems) {
    codeToTradeId.set(code, tradeId);
  }

  const scheduleInputs: ScheduleItemInput[] = [];
  for (const [, info] of tradeItems) {
    const depCodes = TRADE_DEPS[info.code] ?? [];
    const depIds = depCodes.map((c) => codeToTradeId.get(c)).filter(Boolean) as string[];
    // 실제 존재하는 공종만 의존성으로 등록
    const validDeps = depIds.filter((id) => tradeItems.has(id));

    scheduleInputs.push({
      tradeId: info.tradeId,
      title: info.nameKo,
      durationDays: Math.ceil(info.totalDays),
      dependsOn: validDeps,
      kind: "work",
    });
  }

  // 예비 일정 (+20%, 총 공사일의 20%)
  const totalWorkDays = scheduleInputs.reduce((s, i) => s + i.durationDays, 0);
  const reserveDays = Math.max(1, Math.ceil(totalWorkDays * 0.2));
  const lastTradeIds = scheduleInputs.map((i) => i.tradeId);

  scheduleInputs.push({
    tradeId: "reserve",
    title: "예비 일정",
    durationDays: reserveDays,
    dependsOn: lastTradeIds,
    kind: "reserve",
  });

  const scheduledResults = calcSchedule(scheduleInputs);
  const start = new Date(startDate);

  // 기존 일정 삭제 후 재생성
  await supabase.from("schedule_tasks").delete().eq("site_id", siteId);

  const tasksToInsert = scheduledResults.map((r) => ({
    tenant_id: tenantId,
    site_id: siteId,
    trade_id: r.tradeId === "reserve" ? null : r.tradeId,
    title: r.title,
    start_date: offsetToDate(start, r.startOffset).toISOString().split("T")[0],
    end_date: offsetToDate(start, r.endOffset).toISOString().split("T")[0],
    duration_days: r.durationDays,
    depends_on: scheduleInputs.find((i) => i.tradeId === r.tradeId)?.dependsOn ?? null,
    kind: r.kind,
    status: "planned" as const,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from("schedule_tasks").insert(tasksToInsert as any);

  if (error) return { ok: false, error: error.message };

  // 현장 상태를 contracted로 업데이트
  await supabase
    .from("sites")
    .update({ status: "contracted" as const, start_date: startDate })
    .eq("id", siteId);

  revalidatePath(`/schedule/${siteId}`);
  return { ok: true, data: { count: tasksToInsert.length } };
}

/** 작업 날짜 수동 수정 */
export async function updateTaskDates(
  taskId: string,
  startDate: string,
  endDate: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("schedule_tasks")
    .update({
      start_date: startDate,
      end_date: endDate,
      duration_days: Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1,
    })
    .eq("id", taskId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

/** 작업자 배정 */
export async function assignWorker(
  siteId: string,
  taskId: string,
  workerId: string,
  tradeId: string | null,
  startDate: string,
  endDate: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = (user.user_metadata?.tenant_id ?? user.id) as string;

  // 기존 배정 삭제(같은 task에 한 명만)
  await supabase.from("assignments").delete().eq("site_id", siteId).eq("worker_id", workerId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("assignments") as any).insert({
    tenant_id: tenantId,
    site_id: siteId,
    worker_id: workerId,
    trade_id: tradeId,
    start_date: startDate,
    end_date: endDate,
    status: "proposed",
  });

  if (error) return { ok: false, error: error.message };

  // schedule_task에 assignment_id 업데이트는 조회 후 처리 (단순화)
  revalidatePath(`/schedule/${siteId}`);
  return { ok: true, data: undefined };
}

/** 현장 상태 변경 */
export async function updateSiteStatus(
  siteId: string,
  status: "contracted" | "in_progress" | "done" | "canceled"
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sites")
    .update({ status })
    .eq("id", siteId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/schedule/${siteId}`);
  revalidatePath("/");
  return { ok: true, data: undefined };
}

/** 작업 상태 변경 */
export async function updateTaskStatus(
  taskId: string,
  status: "planned" | "active" | "done" | "canceled"
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("schedule_tasks")
    .update({ status })
    .eq("id", taskId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}
