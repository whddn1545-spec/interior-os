"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, TrashIcon, CheckIcon } from "lucide-react";
import { upsertTradePrice, deactivateTradePrice, seedDefaultPrices } from "./actions";

interface Trade { id: string; code: string; name_ko: string; unit: string }
interface Price {
  id: string; trade_id: string; item_name: string;
  material_unit_price: number; labor_day_rate: number; default_days_per_unit: number;
}

interface Props {
  trades: Trade[];
  prices: Price[];
  showSeedButton: boolean;
}

const UNIT_LABEL: Record<string, string> = {
  pyeong: "평", m2: "㎡", m: "m", ea: "개", set: "식", day: "일",
};

export function PriceEditor({ trades, prices, showSeedButton }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingTradeId, setAddingTradeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // form state
  const [form, setForm] = useState({
    itemName: "", materialUnitPrice: "", laborDayRate: "", defaultDaysPerUnit: "",
  });

  function startEdit(price: Price) {
    setEditingId(price.id);
    setAddingTradeId(null);
    setForm({
      itemName: price.item_name,
      materialUnitPrice: String(price.material_unit_price),
      laborDayRate: String(price.labor_day_rate),
      defaultDaysPerUnit: String(price.default_days_per_unit),
    });
  }

  function startAdd(tradeId: string) {
    setAddingTradeId(tradeId);
    setEditingId(null);
    setForm({ itemName: "", materialUnitPrice: "", laborDayRate: "", defaultDaysPerUnit: "0.1" });
  }

  function cancel() {
    setEditingId(null);
    setAddingTradeId(null);
  }

  function handleSave(tradeId: string) {
    startTransition(async () => {
      setError(null);
      const result = await upsertTradePrice({
        id: editingId ?? undefined,
        tradeId,
        itemName: form.itemName.trim(),
        materialUnitPrice: Number(form.materialUnitPrice),
        laborDayRate: Number(form.laborDayRate),
        defaultDaysPerUnit: Number(form.defaultDaysPerUnit),
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        setEditingId(null);
        setAddingTradeId(null);
        setSuccess("저장됐어요. 바뀐 단가는 새로 만드는 견적서부터 적용돼요.");
        setTimeout(() => setSuccess(null), 4000);
        router.refresh();
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deactivateTradePrice(id);
      router.refresh();
    });
  }

  function handleSeedDefaults() {
    startTransition(async () => {
      setError(null);
      const result = await seedDefaultPrices();
      if (!result.ok) {
        setError(result.error);
      } else {
        setSuccess(`기본 단가 ${result.data.count}개를 불러왔어요. 내 사업에 맞게 수정해주세요.`);
        router.refresh();
      }
    });
  }

  // 공종별 단가 그룹
  const priceByTrade = new Map<string, Price[]>();
  for (const p of prices) {
    const arr = priceByTrade.get(p.trade_id) ?? [];
    arr.push(p);
    priceByTrade.set(p.trade_id, arr);
  }

  return (
    <div>
      {error && (
        <div className="bg-red-50 border border-loss/30 rounded-xl px-4 py-3 text-loss mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-profit/10 border border-profit/20 rounded-xl px-4 py-3 text-profit mb-4 flex items-center gap-2">
          <CheckIcon size={18} /> {success}
        </div>
      )}

      {showSeedButton && (
        <button
          onClick={handleSeedDefaults}
          disabled={isPending}
          className="w-full bg-primary text-white rounded-2xl py-4 text-lg font-bold mb-6 disabled:opacity-50"
        >
          {isPending ? "불러오는 중..." : "📥 업계 기본 단가 불러오기"}
        </button>
      )}

      <div className="space-y-4">
        {trades.map((trade) => {
          const tradePrices = priceByTrade.get(trade.id) ?? [];
          const unit = UNIT_LABEL[trade.unit] ?? trade.unit;

          return (
            <div key={trade.id} className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-muted border-b border-border">
                <span className="text-lg font-bold text-foreground">{trade.name_ko}</span>
                <span className="text-sm text-muted-foreground">단위: {unit}</span>
              </div>

              <div className="p-4">
                {/* 기존 단가들 */}
                {tradePrices.map((price) => (
                  <div key={price.id}>
                    {editingId === price.id ? (
                      <PriceForm
                        form={form}
                        setForm={setForm}
                        unit={unit}
                        onSave={() => handleSave(trade.id)}
                        onCancel={cancel}
                        isPending={isPending}
                      />
                    ) : (
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="text-base font-semibold text-foreground">{price.item_name}</p>
                          <p className="text-sm text-muted-foreground">
                            자재 {price.material_unit_price.toLocaleString("ko-KR")}원/{unit} ·
                            일당 {price.labor_day_rate.toLocaleString("ko-KR")}원 ·
                            {unit}당 {price.default_days_per_unit}일
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => startEdit(price)}
                            className="px-4 py-3 bg-muted text-foreground/90 rounded-xl text-base font-medium active:bg-muted"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDelete(price.id)}
                            disabled={isPending}
                            className="p-3 bg-red-50 text-red-500 rounded-xl active:bg-red-100"
                          >
                            <TrashIcon size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* 추가 폼 */}
                {addingTradeId === trade.id && (
                  <PriceForm
                    form={form}
                    setForm={setForm}
                    unit={unit}
                    onSave={() => handleSave(trade.id)}
                    onCancel={cancel}
                    isPending={isPending}
                  />
                )}

                {addingTradeId !== trade.id && (
                  <button
                    onClick={() => startAdd(trade.id)}
                    className="flex items-center gap-2 text-primary font-semibold text-base mt-1 py-3 px-1 active:opacity-70"
                  >
                    <PlusIcon size={18} />
                    단가 추가
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PriceForm({
  form, setForm, unit, onSave, onCancel, isPending
}: {
  form: { itemName: string; materialUnitPrice: string; laborDayRate: string; defaultDaysPerUnit: string };
  setForm: (f: typeof form) => void;
  unit: string;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const materialNum = Number(form.materialUnitPrice);
  const laborNum = Number(form.laborDayRate);
  const daysNum = Number(form.defaultDaysPerUnit);

  // 입력값 범위 힌트 (오타 방지) — 저장은 막지 않고 안내만
  const hasMaterial = form.materialUnitPrice.trim() !== "" && !Number.isNaN(materialNum);
  const hasLabor = form.laborDayRate.trim() !== "" && !Number.isNaN(laborNum);
  const hasDays = form.defaultDaysPerUnit.trim() !== "" && !Number.isNaN(daysNum);

  const materialWarning =
    hasMaterial && materialNum > 0 && materialNum < 1000
      ? "단가가 너무 작아요. 0이 빠지지 않았는지 확인해주세요."
      : hasMaterial && materialNum > 100000000
        ? "단가가 너무 커요. 0을 더 누르지 않았는지 확인해주세요."
        : null;

  const laborWarning =
    hasLabor && laborNum > 0 && laborNum < 50000
      ? "일당이 너무 적어요. 0이 빠지지 않았는지 확인해주세요. (보통 15만~30만원)"
      : hasLabor && laborNum > 2000000
        ? "일당이 너무 많아요. 0을 더 누르지 않았는지 확인해주세요."
        : null;

  const daysWarning =
    hasDays && daysNum > 0 && daysNum > 30
      ? "작업일수가 너무 큰 값이에요. 다시 확인해주세요."
      : null;

  return (
    <div className="bg-primary/10 rounded-xl p-3 mb-3 space-y-3">
      <div>
        <label className="text-base font-semibold text-foreground/90 mb-1 block">자재명</label>
        <p className="text-sm text-muted-foreground mb-1.5">어떤 자재인지 적어주세요. 예) 강마루, 실크벽지</p>
        <input
          type="text"
          placeholder="예: 강마루"
          value={form.itemName}
          onChange={(e) => setForm({ ...form, itemName: e.target.value })}
          className="w-full border border-border rounded-lg px-3 py-3 text-base bg-card focus:outline-none focus:border-primary"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-base font-semibold text-foreground/90 mb-1 block">자재 단가 (원/{unit})</label>
          <p className="text-sm text-muted-foreground mb-1.5">{unit} 1개당 자재값이에요. 예) 30,000원</p>
          <input
            type="number"
            inputMode="numeric"
            placeholder="30000"
            value={form.materialUnitPrice}
            onChange={(e) => setForm({ ...form, materialUnitPrice: e.target.value })}
            className="w-full border border-border rounded-lg px-3 py-3 text-base bg-card focus:outline-none focus:border-primary"
          />
          {materialWarning && (
            <p className="text-sm text-amber-700 mt-1.5 leading-snug">⚠️ {materialWarning}</p>
          )}
        </div>
        <div>
          <label className="text-base font-semibold text-foreground/90 mb-1 block">일당 (원/일)</label>
          <p className="text-sm text-muted-foreground mb-1.5">하루 인건비예요. 예) 250,000원</p>
          <input
            type="number"
            inputMode="numeric"
            placeholder="250000"
            value={form.laborDayRate}
            onChange={(e) => setForm({ ...form, laborDayRate: e.target.value })}
            className="w-full border border-border rounded-lg px-3 py-3 text-base bg-card focus:outline-none focus:border-primary"
          />
          {laborWarning && (
            <p className="text-sm text-amber-700 mt-1.5 leading-snug">⚠️ {laborWarning}</p>
          )}
        </div>
      </div>
      <div>
        <label className="text-base font-semibold text-foreground/90 mb-1 block">{unit}당 작업일수</label>
        <p className="text-sm text-muted-foreground mb-1.5">
          {unit} 1개를 작업하는 데 걸리는 날수예요. 예) 0.12 (약 10개에 하루)
        </p>
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          placeholder="0.12"
          value={form.defaultDaysPerUnit}
          onChange={(e) => setForm({ ...form, defaultDaysPerUnit: e.target.value })}
          className="w-full border border-border rounded-lg px-3 py-3 text-base bg-card focus:outline-none focus:border-primary"
        />
        {daysWarning && (
          <p className="text-sm text-amber-700 mt-1.5 leading-snug">⚠️ {daysWarning}</p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={isPending || !form.itemName}
          className="flex-1 bg-primary text-white rounded-lg py-4 text-base font-semibold disabled:opacity-50"
        >
          {isPending ? "저장 중..." : "저장"}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-card text-foreground/90 rounded-lg py-4 text-base font-medium border border-border"
        >
          취소
        </button>
      </div>
    </div>
  );
}
