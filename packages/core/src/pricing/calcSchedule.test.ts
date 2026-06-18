import { describe, test, expect } from "vitest";
import { calcSchedule, totalDuration } from "./calcSchedule.js";
import type { ScheduleItemInput } from "./types.js";

describe("calcSchedule", () => {
  const items: ScheduleItemInput[] = [
    { tradeId: "demolition", title: "철거", durationDays: 2, kind: "work" },
    { tradeId: "electric", title: "전기", durationDays: 2, dependsOn: ["demolition"], kind: "work" },
    { tradeId: "carpentry", title: "목공", durationDays: 3, dependsOn: ["demolition"], kind: "work" },
    { tradeId: "tile", title: "타일", durationDays: 2, dependsOn: ["electric"], kind: "work" },
    { tradeId: "wallpaper", title: "도배", durationDays: 3, dependsOn: ["carpentry", "tile"], kind: "work" },
  ];

  test("선후행 오프셋 계산", () => {
    const result = calcSchedule(items);
    const byId = Object.fromEntries(result.map((r) => [r.tradeId, r]));

    // 철거: 0~1 (선행 없음)
    expect(byId.demolition.startOffset).toBe(0);
    expect(byId.demolition.endOffset).toBe(1);

    // 전기: 철거(end=1) + 1 = 2 → 2~3
    expect(byId.electric.startOffset).toBe(2);
    expect(byId.electric.endOffset).toBe(3);

    // 목공: 철거(end=1) + 1 = 2 → 2~4 (전기와 병렬)
    expect(byId.carpentry.startOffset).toBe(2);
    expect(byId.carpentry.endOffset).toBe(4);

    // 타일: 전기(end=3) + 1 = 4 → 4~5
    expect(byId.tile.startOffset).toBe(4);
    expect(byId.tile.endOffset).toBe(5);

    // 도배: max(목공end=4, 타일end=5) + 1 = 6 → 6~8
    expect(byId.wallpaper.startOffset).toBe(6);
    expect(byId.wallpaper.endOffset).toBe(8);
  });

  test("총 공사 기간", () => {
    const result = calcSchedule(items);
    expect(totalDuration(result)).toBe(9); // 0~8 → 9일
  });

  test("의존 없는 단일 작업", () => {
    const result = calcSchedule([
      { tradeId: "paint", title: "페인트", durationDays: 5, kind: "work" },
    ]);
    expect(result[0].startOffset).toBe(0);
    expect(result[0].endOffset).toBe(4);
    expect(totalDuration(result)).toBe(5);
  });

  test("빈 입력", () => {
    expect(calcSchedule([])).toEqual([]);
    expect(totalDuration([])).toBe(0);
  });
});
