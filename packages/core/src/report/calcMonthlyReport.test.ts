import { describe, it, expect } from "vitest";
import { calcMonthlyReport, type MonthlyReportInput } from "./calcMonthlyReport";

const base: MonthlyReportInput = {
  income: 30000000,
  expense: 21000000,
  lastMonthIncome: 25000000,
  paymentsDueTotal: 40000000,
  paymentsPaidTotal: 30000000,
  overdueAmount: 5000000,
  quotesCreated: 10,
  quotesSent: 8,
  quotesAccepted: 3,
  sitesCompleted: 2,
};

describe("calcMonthlyReport", () => {
  it("순이익 = 입금 - 지출 (마이너스 허용)", () => {
    expect(calcMonthlyReport(base).netProfit).toBe(9000000);
    expect(calcMonthlyReport({ ...base, expense: 35000000 }).netProfit).toBe(-5000000);
  });

  it("전월 대비 성장률 반올림", () => {
    expect(calcMonthlyReport(base).momGrowthPct).toBe(20);
    expect(calcMonthlyReport({ ...base, income: 20000000 }).momGrowthPct).toBe(-20);
  });

  it("지난달 입금 0원이면 성장률 null (0나눗셈 가드)", () => {
    expect(calcMonthlyReport({ ...base, lastMonthIncome: 0 }).momGrowthPct).toBeNull();
  });

  it("수금율 = 입금 / 약정 총액", () => {
    expect(calcMonthlyReport(base).collectionRatePct).toBe(75);
    expect(calcMonthlyReport({ ...base, paymentsDueTotal: 0 }).collectionRatePct).toBeNull();
  });

  it("견적 전환율 = 계약 / 보낸 견적", () => {
    expect(calcMonthlyReport(base).conversionRatePct).toBe(38); // 3/8 = 37.5 → 38
    expect(calcMonthlyReport({ ...base, quotesSent: 0 }).conversionRatePct).toBeNull();
  });

  it("입력값을 그대로 보존한다", () => {
    const r = calcMonthlyReport(base);
    expect(r.income).toBe(base.income);
    expect(r.sitesCompleted).toBe(2);
    expect(r.overdueAmount).toBe(5000000);
  });
});
