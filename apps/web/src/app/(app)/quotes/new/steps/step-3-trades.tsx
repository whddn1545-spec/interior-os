"use client";

import { useState, useTransition, useEffect } from "react";
import { getTradePrices } from "../actions";
import type { QuoteItemDraft } from "../actions";
import { calcQuote, formatKRW, DISTANCE_FACTORS, DIFFICULTY_FACTORS } from "@interior-os/core/pricing";

interface TradePrice {
  tradeId: string;
  tradeCode: string;
  nameKo: string;
  itemName: string;
  materialUnitPrice: number;
  laborDayRate: number;
  defaultDaysPerUnit: number;
  unit: string;
}

interface Props {
  distanceFactor: number;
  difficultyFactor: number;
  defaultAreaPyeong: number;
  onNext: (items: QuoteItemDraft[]) => void;
  onBack: () => void;
}

const UNIT_LABEL: Record<string, string> = {
  pyeong: "평",
  m2: "㎡",
  m: "m",
  ea: "개",
  set: "세트",
  day: "일",
};

export function Step3Trades({ distanceFactor, difficultyFactor, defaultAreaPyeong, onNext, onBack }: Props) {
  const [prices, setPrices] = useState<TradePrice[]>([]);
  const [selected, setSelected] = useState<Map<string, { price: TradePrice; quantity: string }>>(new Map());
  const [isPending, startTransition] = useTransition();
  const [hasPrices, setHasPrices] = useState(true);

  useEffect(() => {
    startTransition(async () => {
      const res = await getTradePrices();
      if (res.ok) {
        setPrices(res.data);
        setHasPrices(res.data.length > 0);
      }
    });
  }, []);

  function toggle(price: TradePrice) {
    const next = new Map(selected);
    if (next.has(price.tradeId + price.itemName)) {
      next.delete(price.tradeId + price.itemName);
    } else {
      let defaultQty: string;
      if (price.unit === "day") defaultQty = "1";
      else if (price.unit === "m2") defaultQty = (defaultAreaPyeong * 3.305785).toFixed(1);
      else defaultQty = String(defaultAreaPyeong);
      next.set(price.tradeId + price.itemName, { price, quantity: defaultQty });
    }
    setSelected(next);
  }

  function setQty(key: string, value: string) {
    const next = new Map(selected);
    const entry = next.get(key);
    if (entry) next.set(key, { ...entry, quantity: value });
    setSelected(next);
  }

  const previewItems = Array.from(selected.values()).map(({ price, quantity }) => ({
    tradeId: price.tradeId,
    description: `${price.nameKo} - ${price.itemName}`,
    quantity: parseFloat(quantity) || 0,
    unit: price.unit,
    price: {
      materialUnitPrice: price.materialUnitPrice,
      laborDayRate: price.laborDayRate,
      defaultDaysPerUnit: price.defaultDaysPerUnit,
    },
  }));

  const preview = previewItems.length > 0
    ? calcQuote({ items: previewItems, distanceFactor, difficultyFactor })
    : null;

  function handleNext() {
    if (selected.size === 0) return;
    const items: QuoteItemDraft[] = Array.from(selected.values()).map(({ price, quantity }) => ({
      tradeId: price.tradeId,
      description: `${price.nameKo} - ${price.itemName}`,
      quantity: parseFloat(quantity) || 0,
      unit: price.unit,
      materialUnitPrice: price.materialUnitPrice,
      laborDayRate: price.laborDayRate,
      defaultDaysPerUnit: price.defaultDaysPerUnit,
    }));
    onNext(items);
  }

  if (!hasPrices) {
    return (
      <div className="px-4 pt-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">단가표가 없어요</h2>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <p className="text-lg text-amber-800">
            견적을 계산하려면 먼저 단가표를 입력해야 합니다.
          </p>
          <p className="text-base text-amber-600 mt-1">
            설정 → 단가표에서 공종별 자재 단가와 일당을 입력해주세요.
          </p>
        </div>
        <button
          onClick={onBack}
          className="w-full py-4 text-lg border border-gray-300 rounded-xl text-gray-600 font-medium"
        >
          ◀ 이전으로
        </button>
      </div>
    );
  }

  // 공종별 그룹화
  const grouped = prices.reduce<Record<string, TradePrice[]>>((acc, p) => {
    const key = p.nameKo;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className="px-4 pt-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">무슨 공사 하나요?</h2>
      <p className="text-lg text-gray-500 mb-4">공종을 선택하고 수량을 입력하세요</p>

      {isPending && prices.length === 0 ? (
        <p className="text-gray-400 text-lg py-8 text-center">단가표 불러오는 중...</p>
      ) : (
        <div className="space-y-4 mb-6">
          {Object.entries(grouped).map(([groupName, items]) => (
            <div key={groupName} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <span className="text-base font-semibold text-gray-700">{groupName}</span>
              </div>
              {items.map((price) => {
                const key = price.tradeId + price.itemName;
                const isSelected = selected.has(key);
                const entry = selected.get(key);
                return (
                  <div key={key} className="px-4 py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggle(price)}
                        className={`w-7 h-7 rounded-md border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300"
                        }`}
                      >
                        {isSelected && <span className="text-white text-lg leading-none">✓</span>}
                      </button>
                      <div className="flex-1">
                        <p className="text-base font-medium text-gray-800">{price.itemName}</p>
                        <p className="text-sm text-gray-400">
                          자재 {(price.materialUnitPrice).toLocaleString()}원/{UNIT_LABEL[price.unit] ?? price.unit}
                          {" · "}일당 {(price.laborDayRate).toLocaleString()}원
                        </p>
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={entry?.quantity ?? ""}
                            onChange={(e) => setQty(key, e.target.value)}
                            min="0"
                            className="w-20 px-2 py-1.5 text-lg border border-gray-300 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-base text-gray-500">{UNIT_LABEL[price.unit] ?? price.unit}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* 미리보기 합계 */}
      {preview && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex justify-between text-base text-gray-600 mb-1">
            <span>소계</span>
            <span>{formatKRW(preview.subtotal)}</span>
          </div>
          <div className="flex justify-between text-base text-gray-600 mb-1">
            <span>계수 적용 후</span>
            <span>{formatKRW(preview.adjusted)}</span>
          </div>
          <div className="flex justify-between text-base text-gray-600 mb-2">
            <span>예비+비상</span>
            <span>+{formatKRW(preview.reserve + preview.contingency)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-blue-700 border-t border-blue-200 pt-2">
            <span>예상 합계</span>
            <span>{formatKRW(preview.total)}</span>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-4 text-lg border border-gray-300 rounded-xl text-gray-600 font-medium"
        >
          ◀ 이전
        </button>
        <button
          onClick={handleNext}
          disabled={selected.size === 0}
          className="flex-1 py-4 text-lg bg-blue-600 text-white rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          계산 ▶
        </button>
      </div>
    </div>
  );
}
