/** 월간 사장님 리포트 원시 입력 — 모든 값은 DB 집계로 확정된 숫자 */
export interface MonthlyReportInput {
  /** 이번 달 입금 합계 (원) */
  income: number;
  /** 이번 달 지출 합계 (원) */
  expense: number;
  /** 지난달 입금 합계 (원) — 성장률 계산용 */
  lastMonthIncome: number;
  /** 이번 달 약정일이 도래한 수금 예정 총액 (원) */
  paymentsDueTotal: number;
  /** 그중 실제 입금된 금액 (원) */
  paymentsPaidTotal: number;
  /** 현재 연체 중인 미수금 총액 (원, 이번 달 무관 전체) */
  overdueAmount: number;
  /** 이번 달 만든 견적 수 */
  quotesCreated: number;
  /** 이번 달 고객에게 보낸 견적 수 (sent 이상 진행) */
  quotesSent: number;
  /** 이번 달 계약된 견적 수 (accepted) */
  quotesAccepted: number;
  /** 이번 달 완료한 현장 수 */
  sitesCompleted: number;
}

/** 파생 지표 — 나눗셈 가드 포함 */
export interface MonthlyReport extends MonthlyReportInput {
  /** 순이익 (원) = 입금 - 지출 */
  netProfit: number;
  /** 전월 대비 입금 성장률 (%) — 지난달 0원이면 null */
  momGrowthPct: number | null;
  /** 수금율 (%) — 약정 총액 0원이면 null */
  collectionRatePct: number | null;
  /** 견적 전환율 (%) = 계약 / 보낸 견적 — 보낸 견적 0건이면 null */
  conversionRatePct: number | null;
}

/**
 * 월간 리포트 파생 지표 계산.
 * 순수 함수 — DB / LLM / 네트워크 접근 없음. 비율은 정수 %로 반올림.
 */
export function calcMonthlyReport(input: MonthlyReportInput): MonthlyReport {
  const netProfit = input.income - input.expense;

  const momGrowthPct =
    input.lastMonthIncome > 0
      ? Math.round(((input.income - input.lastMonthIncome) / input.lastMonthIncome) * 100)
      : null;

  const collectionRatePct =
    input.paymentsDueTotal > 0
      ? Math.round((input.paymentsPaidTotal / input.paymentsDueTotal) * 100)
      : null;

  const conversionRatePct =
    input.quotesSent > 0
      ? Math.round((input.quotesAccepted / input.quotesSent) * 100)
      : null;

  return {
    ...input,
    netProfit,
    momGrowthPct,
    collectionRatePct,
    conversionRatePct,
  };
}
