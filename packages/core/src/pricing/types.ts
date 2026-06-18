/** 공종별 단가 입력 */
export interface TradePriceInput {
  materialUnitPrice: number; // 자재 단가(단위당)
  laborDayRate: number;      // 일당
  defaultDaysPerUnit: number; // 단위당 기준 작업일
}

/** 견적 항목 입력 */
export interface QuoteItemInput {
  tradeId: string;
  description: string;
  quantity: number;
  unit: string;
  price: TradePriceInput;
  /** 작업일을 직접 지정하면 defaultDaysPerUnit 무시 */
  overrideLaborDays?: number;
}

/** 항목별 계산 결과 */
export interface LineResult {
  tradeId: string;
  description: string;
  quantity: number;
  unit: string;
  materialCost: number;
  laborDays: number;
  laborCost: number;
  lineTotal: number;
}

/** 견적 전체 계산 결과 */
export interface QuoteResult {
  items: LineResult[];
  subtotal: number;      // Σ lineTotal
  adjusted: number;      // subtotal × distanceFactor × difficultyFactor
  reserve: number;       // adjusted × reserveRate
  contingency: number;   // adjusted × contingencyRate
  total: number;         // adjusted + reserve + contingency (원 단위 반올림)
  /** 적용 계수 스냅샷 (견적 저장 시 DB에 그대로 기록) */
  snapshot: {
    distanceFactor: number;
    difficultyFactor: number;
    reserveRate: number;
    contingencyRate: number;
  };
}

/** 공사 일정 항목 입력 */
export interface ScheduleItemInput {
  tradeId: string;
  title: string;
  durationDays: number;
  dependsOn?: string[]; // 선행 tradeId 목록
  kind: "work" | "reserve" | "contingency";
}

/** 일정 계산 결과 */
export interface ScheduleResult {
  tradeId: string;
  title: string;
  startOffset: number; // 착공일 기준 일수 오프셋
  endOffset: number;
  durationDays: number;
  kind: "work" | "reserve" | "contingency";
}

/** 거리 구역 */
export const DISTANCE_FACTORS = {
  city: 1.00,    // 시내
  suburb: 1.05,  // 근교
  remote: 1.15,  // 원거리
  island: 1.30,  // 도서·산간
} as const;

/** 난이도 계수 */
export const DIFFICULTY_FACTORS = {
  easy: 1.00,    // 빈집
  normal: 1.10,  // 거주 중
  hard: 1.25,    // 고층/협소
} as const;

export type DistanceZoneKey = keyof typeof DISTANCE_FACTORS;
export type DifficultyKey = keyof typeof DIFFICULTY_FACTORS;
