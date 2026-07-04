/** 밀린 일정 재계산 입력 작업 */
export interface ShiftTaskInput {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: string; // planned | active | done | canceled
}

export interface ShiftUpdate {
  id: string;
  startDate: string;
  endDate: string;
}

export interface DelayShiftPlan {
  /** 며칠 밀렸는지 */
  delayDays: number;
  /** 기준이 된 (가장 많이 밀린) 미완료 작업 */
  overdueTaskId: string;
  /** 적용할 날짜 변경 목록 */
  updates: ShiftUpdate[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toUTC(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getTime();
}

function addDays(dateStr: string, days: number): string {
  return new Date(toUTC(dateStr) + days * DAY_MS).toISOString().split("T")[0];
}

/**
 * 밀린 일정 감지 및 후속 일정 재계산 플랜.
 * 순수 함수 — DB / 네트워크 접근 없음.
 *
 * 규칙:
 * - 종료일이 지났는데 완료되지 않은(planned/active) 작업 중 가장 많이 밀린 것을 기준으로 잡는다.
 * - 기준 작업: 종료일을 오늘까지 연장 (시작일 유지 — 이미 진행 중인 작업의 시작은 과거 사실).
 * - 기준 작업의 원래 종료일 이후에 시작하는 미완료 작업: 시작·종료를 같은 날수만큼 민다.
 * - done / canceled 작업은 건드리지 않는다.
 *
 * 밀린 작업이 없으면 null.
 */
export function planDelayShift(
  tasks: ShiftTaskInput[],
  todayStr: string
): DelayShiftPlan | null {
  const today = toUTC(todayStr);

  const unfinished = tasks.filter(
    (t) => (t.status === "planned" || t.status === "active") && t.startDate && t.endDate
  );

  // 가장 많이 밀린 미완료 작업
  let overdue: ShiftTaskInput | null = null;
  let maxDelay = 0;
  for (const t of unfinished) {
    const delay = Math.round((today - toUTC(t.endDate)) / DAY_MS);
    if (delay > maxDelay) {
      maxDelay = delay;
      overdue = t;
    }
  }
  if (!overdue || maxDelay <= 0) return null;

  const updates: ShiftUpdate[] = [
    // 기준 작업: 종료일만 오늘로 연장
    { id: overdue.id, startDate: overdue.startDate, endDate: todayStr },
  ];

  const pivotEnd = toUTC(overdue.endDate);
  for (const t of unfinished) {
    if (t.id === overdue.id) continue;
    if (toUTC(t.startDate) > pivotEnd) {
      updates.push({
        id: t.id,
        startDate: addDays(t.startDate, maxDelay),
        endDate: addDays(t.endDate, maxDelay),
      });
    }
  }

  return { delayDays: maxDelay, overdueTaskId: overdue.id, updates };
}
