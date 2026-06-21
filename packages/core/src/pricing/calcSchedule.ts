import type { ScheduleItemInput, ScheduleResult } from "./types";

/**
 * 선후행 의존 관계를 기반으로 공사 일정 오프셋 계산.
 * 순수 함수 — 착공일(day 0) 기준 각 작업의 시작/종료 오프셋을 반환.
 *
 * 알고리즘: 위상 정렬(Kahn) → 각 노드의 startOffset = max(선행 endOffset) + 1
 */
export function calcSchedule(items: ScheduleItemInput[]): ScheduleResult[] {
  const map = new Map<string, ScheduleItemInput>(
    items.map((item) => [item.tradeId, item])
  );

  // 사이클 감지 + 위상 정렬 (Kahn's algorithm)
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>(); // tradeId → 이 작업에 의존하는 것들

  for (const item of items) {
    if (!inDegree.has(item.tradeId)) inDegree.set(item.tradeId, 0);
    if (!adj.has(item.tradeId)) adj.set(item.tradeId, []);
    for (const dep of item.dependsOn ?? []) {
      inDegree.set(item.tradeId, (inDegree.get(item.tradeId) ?? 0) + 1);
      adj.get(dep)?.push(item.tradeId) ?? adj.set(dep, [item.tradeId]);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const endOffsets = new Map<string, number>(); // 각 tradeId의 end offset
  const results: ScheduleResult[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    const item = map.get(id)!;

    // 선행 작업 중 가장 늦게 끝나는 날 다음 날 시작
    let startOffset = 0;
    for (const dep of item.dependsOn ?? []) {
      const depEnd = endOffsets.get(dep);
      if (depEnd !== undefined) {
        startOffset = Math.max(startOffset, depEnd + 1);
      }
    }
    const endOffset = startOffset + item.durationDays - 1;
    endOffsets.set(id, endOffset);

    results.push({
      tradeId: id,
      title: item.title,
      startOffset,
      endOffset,
      durationDays: item.durationDays,
      kind: item.kind,
    });

    for (const next of adj.get(id) ?? []) {
      inDegree.set(next, (inDegree.get(next) ?? 1) - 1);
      if (inDegree.get(next) === 0) queue.push(next);
    }
  }

  // 입력 순서 기준 정렬 (시작 오프셋 → tradeId)
  return results.sort((a, b) => a.startOffset - b.startOffset || a.tradeId.localeCompare(b.tradeId));
}

/**
 * 오프셋 + 착공일 → 실제 날짜.
 * 주말 skip 없음 (실제 공사는 주말도 진행).
 */
export function offsetToDate(startDate: Date, offsetDays: number): Date {
  const d = new Date(startDate);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

/** 총 공사 기간 (예비/비상 포함) */
export function totalDuration(results: ScheduleResult[]): number {
  if (results.length === 0) return 0;
  return Math.max(...results.map((r) => r.endOffset)) + 1;
}
