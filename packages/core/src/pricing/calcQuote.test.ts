import { describe, test, expect } from "vitest";
import { calcLineItem, calcQuote, formatKRW } from "./calcQuote.js";
import { SEED_PRICES, DISTANCE_FACTORS, DIFFICULTY_FACTORS } from "./index.js";

describe("calcLineItem", () => {
  test("도배 33평 계산", () => {
    const result = calcLineItem({
      tradeId: "wallpaper",
      description: "도배 33평",
      quantity: 33,
      unit: "pyeong",
      price: SEED_PRICES.wallpaper,
    });
    expect(result.materialCost).toBe(990_000);
    expect(result.laborDays).toBe(3.96);
    expect(result.laborCost).toBe(990_000);
    expect(result.lineTotal).toBe(1_980_000);
  });

  test("overrideLaborDays 적용", () => {
    const result = calcLineItem({
      tradeId: "carpentry",
      description: "목공 3일",
      quantity: 1,
      unit: "day",
      price: SEED_PRICES.carpentry,
      overrideLaborDays: 3,
    });
    expect(result.laborDays).toBe(3);
    expect(result.laborCost).toBe(960_000);
    expect(result.materialCost).toBe(0);
    expect(result.lineTotal).toBe(960_000);
  });
});

describe("calcQuote", () => {
  test("PLAN.md 예시 계산 — 도배+바닥+타일, 시내, 보통", () => {
    const result = calcQuote({
      items: [
        {
          tradeId: "wallpaper",
          description: "도배 33평",
          quantity: 33,
          unit: "pyeong",
          price: SEED_PRICES.wallpaper,
        },
        {
          tradeId: "flooring",
          description: "바닥재(강마루) 33평",
          quantity: 33,
          unit: "pyeong",
          price: SEED_PRICES.flooring,
        },
        {
          tradeId: "tile",
          description: "타일 16.5m²",
          quantity: 16.5,
          unit: "m2",
          price: SEED_PRICES.tile,
        },
      ],
      distanceFactor: DISTANCE_FACTORS.city,
      difficultyFactor: DIFFICULTY_FACTORS.normal,
    });

    // 도배: 33×30,000 + round(33×0.12×250,000) = 990,000 + 990,000 = 1,980,000
    // 바닥: 33×70,000 + round(33×0.10×280,000) = 2,310,000 + 924,000 = 3,234,000
    // 타일: round(16.5×90,000) + round(16.5×0.25×300,000) = 1,485,000 + 1,237,500 = 2,722,500
    expect(result.subtotal).toBe(7_936_500);

    // adjusted = 7,936,500 × 1.00 × 1.10 = 8,730,150
    expect(result.adjusted).toBe(8_730_150);

    expect(result.reserve).toBe(1_746_030);     // × 0.20
    expect(result.contingency).toBe(873_015);   // × 0.10

    // total = 8,730,150 + 1,746,030 + 873,015 = 11,349,195
    expect(result.total).toBe(11_349_195);
  });

  test("스냅샷 계수 저장", () => {
    const result = calcQuote({
      items: [],
      distanceFactor: 1.15,
      difficultyFactor: 1.25,
      reserveRate: 0.15,
      contingencyRate: 0.05,
    });
    expect(result.snapshot).toEqual({
      distanceFactor: 1.15,
      difficultyFactor: 1.25,
      reserveRate: 0.15,
      contingencyRate: 0.05,
    });
    expect(result.total).toBe(0);
  });
});

describe("formatKRW", () => {
  test("포매팅", () => {
    expect(formatKRW(11_349_195)).toBe("11,349,195원");
    expect(formatKRW(0)).toBe("0원");
  });
});
