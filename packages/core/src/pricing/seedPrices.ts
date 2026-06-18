import type { TradePriceInput } from "./types.js";

/**
 * 온보딩용 기본 단가 시드.
 * 실제 운영 전 사업자가 단가표 화면에서 덮어씀.
 * DB에 저장되는 값이 아니라 초기 입력 안내용.
 */
export const SEED_PRICES: Record<string, TradePriceInput & { unit: string; nameKo: string }> = {
  wallpaper: {
    nameKo: "도배",
    unit: "pyeong",
    materialUnitPrice: 30_000,
    laborDayRate: 250_000,
    defaultDaysPerUnit: 0.12,
  },
  flooring: {
    nameKo: "바닥재(강마루)",
    unit: "pyeong",
    materialUnitPrice: 70_000,
    laborDayRate: 280_000,
    defaultDaysPerUnit: 0.10,
  },
  tile: {
    nameKo: "타일",
    unit: "m2",
    materialUnitPrice: 90_000,
    laborDayRate: 300_000,
    defaultDaysPerUnit: 0.25,
  },
  paint: {
    nameKo: "페인트",
    unit: "m2",
    materialUnitPrice: 25_000,
    laborDayRate: 230_000,
    defaultDaysPerUnit: 0.10,
  },
  carpentry: {
    nameKo: "목공",
    unit: "day",
    materialUnitPrice: 0,
    laborDayRate: 320_000,
    defaultDaysPerUnit: 1.0,
  },
  electric: {
    nameKo: "전기",
    unit: "day",
    materialUnitPrice: 0,
    laborDayRate: 300_000,
    defaultDaysPerUnit: 1.0,
  },
  plumbing: {
    nameKo: "배관·설비",
    unit: "day",
    materialUnitPrice: 0,
    laborDayRate: 320_000,
    defaultDaysPerUnit: 1.0,
  },
  demolition: {
    nameKo: "철거",
    unit: "pyeong",
    materialUnitPrice: 15_000,
    laborDayRate: 250_000,
    defaultDaysPerUnit: 0.08,
  },
  window: {
    nameKo: "창호",
    unit: "ea",
    materialUnitPrice: 350_000,
    laborDayRate: 300_000,
    defaultDaysPerUnit: 0.3,
  },
  bathroom: {
    nameKo: "욕실(전체)",
    unit: "set",
    materialUnitPrice: 2_500_000,
    laborDayRate: 350_000,
    defaultDaysPerUnit: 3.0,
  },
  kitchen: {
    nameKo: "주방(싱크)",
    unit: "set",
    materialUnitPrice: 1_800_000,
    laborDayRate: 300_000,
    defaultDaysPerUnit: 2.0,
  },
  film: {
    nameKo: "필름",
    unit: "m2",
    materialUnitPrice: 40_000,
    laborDayRate: 280_000,
    defaultDaysPerUnit: 0.08,
  },
};
