import { describe, it, expect } from "vitest";
import { planDelayShift, type ShiftTaskInput } from "./shiftSchedule";

const tasks: ShiftTaskInput[] = [
  { id: "demolition", startDate: "2026-07-01", endDate: "2026-07-03", status: "active" },
  { id: "plumbing", startDate: "2026-07-04", endDate: "2026-07-05", status: "planned" },
  { id: "carpentry", startDate: "2026-07-06", endDate: "2026-07-10", status: "planned" },
  { id: "painting", startDate: "2026-07-11", endDate: "2026-07-12", status: "planned" },
];

describe("planDelayShift", () => {
  it("밀린 작업이 없으면 null", () => {
    expect(planDelayShift(tasks, "2026-07-02")).toBeNull();
  });

  it("종료일 당일은 밀림이 아니다", () => {
    expect(planDelayShift(tasks, "2026-07-03")).toBeNull();
  });

  it("가장 밀린 작업 기준으로 후속 일정을 같은 날수만큼 민다", () => {
    // 철거(~7/3)가 끝나지 않은 채 7/5 → 2일 밀림
    const plan = planDelayShift(tasks, "2026-07-05");
    expect(plan).not.toBeNull();
    expect(plan!.delayDays).toBe(2);
    expect(plan!.overdueTaskId).toBe("demolition");

    const byId = new Map(plan!.updates.map((u) => [u.id, u]));
    // 기준 작업: 종료일만 오늘로 연장
    expect(byId.get("demolition")).toEqual({
      id: "demolition",
      startDate: "2026-07-01",
      endDate: "2026-07-05",
    });
    // 후속 작업들: 2일씩 밀림
    expect(byId.get("plumbing")).toEqual({
      id: "plumbing",
      startDate: "2026-07-06",
      endDate: "2026-07-07",
    });
    expect(byId.get("carpentry")).toEqual({
      id: "carpentry",
      startDate: "2026-07-08",
      endDate: "2026-07-12",
    });
    expect(byId.get("painting")).toEqual({
      id: "painting",
      startDate: "2026-07-13",
      endDate: "2026-07-14",
    });
  });

  it("done/canceled 작업은 밀림 기준도, 이동 대상도 아니다", () => {
    const withDone: ShiftTaskInput[] = [
      { id: "demolition", startDate: "2026-07-01", endDate: "2026-07-03", status: "done" },
      { id: "plumbing", startDate: "2026-07-04", endDate: "2026-07-05", status: "planned" },
      { id: "carpentry", startDate: "2026-07-06", endDate: "2026-07-10", status: "canceled" },
    ];
    // done인 철거는 무시 → 설비(~7/5)가 7/7 기준 2일 밀림
    const plan = planDelayShift(withDone, "2026-07-07");
    expect(plan).not.toBeNull();
    expect(plan!.overdueTaskId).toBe("plumbing");
    expect(plan!.delayDays).toBe(2);
    // canceled인 목공은 이동 대상 아님
    expect(plan!.updates.map((u) => u.id)).toEqual(["plumbing"]);
  });

  it("기준 작업과 겹쳐 진행 중인 작업은 밀지 않는다", () => {
    const overlapping: ShiftTaskInput[] = [
      { id: "demolition", startDate: "2026-07-01", endDate: "2026-07-03", status: "active" },
      // 철거와 겹치는 기간에 시작 — 이미 시작했을 수 있으니 유지
      { id: "electric", startDate: "2026-07-03", endDate: "2026-07-06", status: "active" },
      { id: "carpentry", startDate: "2026-07-04", endDate: "2026-07-08", status: "planned" },
    ];
    const plan = planDelayShift(overlapping, "2026-07-05");
    expect(plan).not.toBeNull();
    expect(plan!.overdueTaskId).toBe("demolition");
    const ids = plan!.updates.map((u) => u.id);
    expect(ids).toContain("demolition");
    expect(ids).toContain("carpentry"); // 7/4 > 7/3 → 이동
    expect(ids).not.toContain("electric"); // 7/3 = 기준 종료일과 같음 → 유지
  });
});
