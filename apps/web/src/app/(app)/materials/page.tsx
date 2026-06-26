"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, CalculatorIcon } from "lucide-react";

const MATERIAL_FORMULAS: {
  trade: string;
  label: string;
  items: { name: string; unit: string; formula: (area: number, extra: number) => number; formulaText: string }[];
}[] = [
  {
    trade: "wallpaper",
    label: "도배",
    items: [
      { name: "실크벽지", unit: "롤", formula: (area) => Math.ceil(area * 0.55), formulaText: "평수 × 0.55" },
      { name: "합지벽지", unit: "롤", formula: (area) => Math.ceil(area * 0.55), formulaText: "평수 × 0.55" },
      { name: "풀(접착제)", unit: "통", formula: (area) => Math.ceil(area / 20), formulaText: "평수 ÷ 20" },
    ],
  },
  {
    trade: "flooring",
    label: "바닥재",
    items: [
      { name: "강마루", unit: "박스", formula: (area) => Math.ceil(area * 3.305 / 2.4 * 1.1), formulaText: "㎡(평×3.305) ÷ 박스당면적(2.4) × 손실율(1.1)" },
      { name: "강화마루", unit: "박스", formula: (area) => Math.ceil(area * 3.305 / 2.16 * 1.1), formulaText: "㎡ ÷ 2.16 × 1.1" },
      { name: "데코타일", unit: "박스", formula: (area) => Math.ceil(area * 3.305 / 1.0 * 1.1), formulaText: "㎡ × 1.1" },
    ],
  },
  {
    trade: "tile",
    label: "타일",
    items: [
      { name: "타일(300×300)", unit: "박스", formula: (area) => Math.ceil(area * 3.305 / 0.81 * 1.1), formulaText: "㎡ ÷ 0.81 × 1.1" },
      { name: "타일(600×600)", unit: "박스", formula: (area) => Math.ceil(area * 3.305 / 3.24 * 1.1), formulaText: "㎡ ÷ 3.24 × 1.1" },
      { name: "타일본드", unit: "포대", formula: (area) => Math.ceil(area * 3.305 / 5), formulaText: "㎡ ÷ 5" },
      { name: "타일줄눈", unit: "포대", formula: (area) => Math.ceil(area * 3.305 / 10), formulaText: "㎡ ÷ 10" },
    ],
  },
  {
    trade: "paint",
    label: "페인트",
    items: [
      { name: "내부용 페인트", unit: "통(18L)", formula: (area) => Math.ceil(area * 3.305 / 8), formulaText: "㎡ ÷ 8" },
      { name: "프라이머", unit: "통(18L)", formula: (area) => Math.ceil(area * 3.305 / 10), formulaText: "㎡ ÷ 10" },
    ],
  },
  {
    trade: "demolition",
    label: "철거",
    items: [
      { name: "폐기물 봉투(마대)", unit: "장", formula: (area) => Math.ceil(area * 0.3), formulaText: "평수 × 0.3" },
    ],
  },
];

export default function MaterialsPage() {
  const [selectedTrade, setSelectedTrade] = useState(MATERIAL_FORMULAS[0].trade);
  const [areaPyeong, setAreaPyeong] = useState<number | "">(33);
  const [results, setResults] = useState<{ name: string; unit: string; qty: number; formulaText: string }[]>([]);
  const [calculated, setCalculated] = useState(false);

  function handleCalculate() {
    if (!areaPyeong) return;
    const formula = MATERIAL_FORMULAS.find((f) => f.trade === selectedTrade);
    if (!formula) return;

    const calced = formula.items.map((item) => ({
      name: item.name,
      unit: item.unit,
      qty: item.formula(areaPyeong as number, 0),
      formulaText: item.formulaText,
    }));
    setResults(calced);
    setCalculated(true);
  }

  const selectedLabel = MATERIAL_FORMULAS.find((f) => f.trade === selectedTrade)?.label ?? "";

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-2 -ml-2 text-gray-600">
          <ArrowLeftIcon size={24} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">자재 수량 산출</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800">
          공종과 면적을 입력하면 필요한 자재 수량을 자동으로 계산해드려요
        </div>

        {/* 공종 선택 */}
        <div>
          <label className="block text-base font-semibold text-gray-700 mb-2">공종</label>
          <div className="grid grid-cols-3 gap-2">
            {MATERIAL_FORMULAS.map(({ trade, label }) => (
              <button
                key={trade}
                onClick={() => { setSelectedTrade(trade); setCalculated(false); }}
                className={`py-4 rounded-xl text-base font-semibold transition-colors ${
                  selectedTrade === trade
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-300 text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 면적 입력 */}
        <div>
          <label className="block text-base font-semibold text-gray-700 mb-2">면적 (평)</label>
          <div className="flex gap-3 items-center">
            <input
              type="number"
              min={1}
              max={200}
              value={areaPyeong}
              onChange={(e) => { setAreaPyeong(e.target.value ? Number(e.target.value) : ""); setCalculated(false); }}
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-xl font-bold text-center"
            />
            <span className="text-lg text-gray-500 font-medium">평</span>
          </div>
          {areaPyeong ? (
            <p className="text-sm text-gray-500 mt-1 text-center">
              약 {((areaPyeong as number) * 3.305).toFixed(1)}㎡
            </p>
          ) : null}
        </div>

        {/* 계산 버튼 */}
        <button
          onClick={handleCalculate}
          disabled={!areaPyeong}
          className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl text-lg font-bold disabled:opacity-50"
        >
          <CalculatorIcon size={22} />
          {selectedLabel} 자재 계산
        </button>

        {/* 결과 */}
        {calculated && results.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {selectedLabel} {areaPyeong}평 필요 자재
            </h2>
            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-base font-semibold text-gray-900">{r.name}</p>
                    <p className="text-sm text-gray-500">{r.formulaText}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-blue-700">{r.qty}</p>
                    <p className="text-sm text-gray-500">{r.unit}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              ⚠️ 계산값은 참고용이며 현장 조건에 따라 달라질 수 있어요. 발주 전 반드시 재확인하세요.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
