import { describe, it, expect } from "vitest";
import { composeBriefing, type BriefingInput } from "./composeBriefing";

const base: BriefingInput = {
  dateLabel: "7월 5일 (토)",
  tasks: [],
  payments: [],
  staleQuoteCount: 0,
};

describe("composeBriefing", () => {
  it("알릴 내용이 없으면 null (문자 미발송)", () => {
    expect(composeBriefing(base)).toBeNull();
  });

  it("오늘 작업 + 작업자 이름 포함", () => {
    const body = composeBriefing({
      ...base,
      tasks: [{ siteName: "역삼동 32평", title: "목공", workerNames: ["김반장"] }],
    });
    expect(body).toContain("[오늘 공사 1건]");
    expect(body).toContain("· 역삼동 32평 목공 (김반장)");
  });

  it("작업 3건 초과 시 '외 N건'으로 축약", () => {
    const tasks = Array.from({ length: 5 }, (_, i) => ({
      siteName: `현장${i + 1}`,
      title: "도배",
      workerNames: [],
    }));
    const body = composeBriefing({ ...base, tasks });
    expect(body).toContain("[오늘 공사 5건]");
    expect(body).toContain("· 외 2건");
    expect(body).not.toContain("현장4");
  });

  it("미수금 합계·건별 D-day 표기", () => {
    const body = composeBriefing({
      ...base,
      payments: [
        { siteName: "역삼동", stageLabel: "잔금", amount: 3000000, overdueDays: 3 },
        { siteName: "청담동", stageLabel: "중도금", amount: 12000000, overdueDays: 0 },
        { siteName: "송파", stageLabel: "계약금", amount: 5000000, overdueDays: -2 },
      ],
    });
    expect(body).toContain("[받을 돈 2,000만원]");
    expect(body).toContain("· 역삼동 잔금 300만원 — 3일 지남");
    expect(body).toContain("· 청담동 중도금 1,200만원 — 오늘 약정");
    expect(body).toContain("· 송파 계약금 500만원 — 2일 후 약정");
  });

  it("억 단위 금액 표기", () => {
    const body = composeBriefing({
      ...base,
      payments: [
        { siteName: "한남동", stageLabel: "잔금", amount: 150000000, overdueDays: 1 },
      ],
    });
    expect(body).toContain("1.5억원");
  });

  it("무응답 견적 섹션", () => {
    const body = composeBriefing({ ...base, staleQuoteCount: 2 });
    expect(body).toContain("[답 없는 견적 2건]");
  });

  it("전체 조립 — 날짜 헤더 + 섹션 순서(공사 → 돈 → 견적)", () => {
    const body = composeBriefing({
      dateLabel: "7월 5일 (토)",
      tasks: [{ siteName: "역삼동", title: "철거", workerNames: [] }],
      payments: [{ siteName: "역삼동", stageLabel: "계약금", amount: 1000000, overdueDays: 0 }],
      staleQuoteCount: 1,
    });
    expect(body).not.toBeNull();
    const text = body!;
    expect(text.startsWith("7월 5일 (토) 아침 브리핑")).toBe(true);
    expect(text.indexOf("[오늘 공사")).toBeLessThan(text.indexOf("[받을 돈"));
    expect(text.indexOf("[받을 돈")).toBeLessThan(text.indexOf("[답 없는 견적"));
  });
});
