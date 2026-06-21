import type {
  QuoteItemInput,
  LineResult,
  QuoteResult,
} from "./types";

/**
 * 견적 항목 1개 계산.
 * 순수 함수 — DB / LLM / 네트워크 접근 없음.
 */
export function calcLineItem(item: QuoteItemInput): LineResult {
  const materialCost = Math.round(item.quantity * item.price.materialUnitPrice);
  const laborDays =
    item.overrideLaborDays ?? item.quantity * item.price.defaultDaysPerUnit;
  const laborCost = Math.round(laborDays * item.price.laborDayRate);
  const lineTotal = materialCost + laborCost;

  return {
    tradeId: item.tradeId,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    materialCost,
    laborDays: Math.round(laborDays * 100) / 100, // 소수 둘째자리까지
    laborCost,
    lineTotal,
  };
}

/**
 * 견적 전체 계산.
 *
 * 공식:
 *   adjusted    = subtotal × distanceFactor × difficultyFactor
 *   reserve     = adjusted × reserveRate
 *   contingency = adjusted × contingencyRate
 *   total       = round(adjusted + reserve + contingency)
 *
 * 모든 금액은 원(₩) 단위 정수. 중간 값은 반올림하지 않고 마지막에만 반올림.
 */
export function calcQuote(input: {
  items: QuoteItemInput[];
  distanceFactor: number;
  difficultyFactor: number;
  reserveRate?: number;
  contingencyRate?: number;
}): QuoteResult {
  const reserveRate = input.reserveRate ?? 0.20;
  const contingencyRate = input.contingencyRate ?? 0.10;

  const lineResults = input.items.map(calcLineItem);
  const subtotal = lineResults.reduce((sum, r) => sum + r.lineTotal, 0);

  const adjusted = subtotal * input.distanceFactor * input.difficultyFactor;
  const reserve = adjusted * reserveRate;
  const contingency = adjusted * contingencyRate;
  const total = Math.round(adjusted + reserve + contingency);

  return {
    items: lineResults,
    subtotal,
    adjusted: Math.round(adjusted),
    reserve: Math.round(reserve),
    contingency: Math.round(contingency),
    total,
    snapshot: {
      distanceFactor: input.distanceFactor,
      difficultyFactor: input.difficultyFactor,
      reserveRate,
      contingencyRate,
    },
  };
}

/** 금액을 한국 원화 표기로 포매팅 ("8,222,500원") */
export function formatKRW(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}
