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
  const [nextError, setNextError] = useState<string | null>(null);

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
    const items: QuoteItemDraft[] = Array.from(selected.values())
      .filter(({ quantity }) => parseFloat(quantity) > 0)
      .map(({ price, quantity }) => ({
        tradeId: price.tradeId,
        description: `${price.nameKo} - ${price.itemName}`,
        quantity: parseFloat(quantity),
        unit: price.unit,
        materialUnitPrice: price.materialUnitPrice,
        laborDayRate: price.laborDayRate,
        defaultDaysPerUnit: price.defaultDaysPerUnit,
      }));

    if (items.length === 0) {
      setNextError("체크한 항목의 수량을 1 이상 입력해주세요");
      return;
    }
    setNextError(null);
    onNext(items);
  }

  if (!hasPrices) {
    return (
      <div className="px-4 pt-6">
        <h2 className="text-2xl font-bold text-foreground mb-4">단가표가 없어요</h2>
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
          className="w-full py-4 text-lg border border-border rounded-xl text-muted-foreground font-medium"
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
      <h2 className="text-2xl font-bold text-foreground mb-2">무슨 공사 하나요?</h2>
      <p className="text-lg text-muted-foreground mb-4">공종을 선택하고 수량을 입력하세요</p>

      {isPending && prices.length === 0 ? (
        <p className="text-muted-foreground/70 text-lg py-8 text-center">단가표 불러오는 중...</p>
      ) : (
        <div className="space-y-4 mb-6">
          {Object.entries(grouped).map(([groupName, items]) => (
            <div key={groupName} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-muted border-b border-border">
                <span className="text-base font-semibold text-foreground/90">{groupName}</span>
              </div>
              {items.map((price) => {
                const key = price.tradeId + price.itemName;
                const isSelected = selected.has(key);
                const entry = selected.get(key);
                return (
                  <div key={key} className={`border-b border-border last:border-0 ${isSelected ? "bg-primary/10" : ""}`}>
                    {/* 전체 행 탭으로 선택/해제 */}
                    <button
                      onClick={() => toggle(price)}
                      className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-blue-100"
                    >
                      <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? "border-blue-500 bg-primary/100" : "border-border"
                      }`}>
                        {isSelected && <span className="text-white text-xl font-bold leading-none">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-foreground">{price.itemName}</p>
                        <p className="text-sm text-muted-foreground/70">
                          자재 {(price.materialUnitPrice).toLocaleString()}원/{UNIT_LABEL[price.unit] ?? price.unit}
                          {" · "}일당 {(price.laborDayRate).toLocaleString()}원
                        </p>
                      </div>
                    </button>
                    {/* 수량 입력 — 선택 시 하단에 별도 노출 */}
                    {isSelected && (
                      <div className="flex items-center gap-2 px-4 pb-3 pl-16">
                        <span className="text-base text-muted-foreground">수량</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={entry?.quantity ?? ""}
                          onChange={(e) => setQty(key, e.target.value)}
                          min="0"
                          className="w-24 px-3 py-3 text-xl font-bold border-2 border-blue-300 rounded-xl text-right focus:outline-none focus:ring-2 focus:ring-primary/500"
                        />
                        <span className="text-base font-medium text-foreground/90">{UNIT_LABEL[price.unit] ?? price.unit}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* 미리보기 합계 */}
      {preview && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-6">
          <div className="flex justify-between text-base text-muted-foreground mb-1">
            <span>소계</span>
            <span>{formatKRW(preview.subtotal)}</span>
          </div>
          <div className="flex justify-between text-base text-muted-foreground mb-1">
            <span>계수 적용 후</span>
            <span>{formatKRW(preview.adjusted)}</span>
          </div>
          <div className="flex justify-between text-base text-muted-foreground mb-2">
            <span>예비+비상</span>
            <span>+{formatKRW(preview.reserve + preview.contingency)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-primary/90 border-t border-primary/30 pt-2">
            <span>예상 합계</span>
            <span>{formatKRW(preview.total)}</span>
          </div>
        </div>
      )}

      {nextError && (
        <div className="bg-red-50 border border-loss/30 rounded-xl px-4 py-3 text-loss text-base">
          {nextError}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-4 text-lg border border-border rounded-xl text-muted-foreground font-medium"
        >
          ◀ 이전
        </button>
        <button
          onClick={handleNext}
          disabled={selected.size === 0}
          className="flex-1 py-4 text-lg bg-primary text-white rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          계산 ▶
        </button>
      </div>
    </div>
  );
}
