"use client";

import { useState, useTransition, useEffect } from "react";
import { calcQuote, formatKRW } from "@interior-os/core/pricing";
import { saveQuoteDraft, confirmQuote, reviewQuoteDraft } from "../actions";
import { createPaymentSchedule } from "@/app/(app)/payments/actions";
import type { QuoteItemDraft } from "../actions";
import { AlertTriangleIcon, SparklesIcon } from "lucide-react";

interface Props {
  siteId: string;
  siteName?: string;
  items: QuoteItemDraft[];
  distanceFactor: number;
  difficultyFactor: number;
  areaPyeong: number;
  onConfirmed: (quoteId: string, total: number) => void;
  onBack: () => void;
}

export function Step4Review({ siteId, siteName, items, distanceFactor, difficultyFactor, areaPyeong, onConfirmed, onBack }: Props) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [scheduleWarning, setScheduleWarning] = useState<string | null>(null);
  const [aiBullets, setAiBullets] = useState<string[] | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState(false);

  const result = calcQuote({ items: items.map(item => ({
    tradeId: item.tradeId,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    price: {
      materialUnitPrice: item.materialUnitPrice,
      laborDayRate: item.laborDayRate,
      defaultDaysPerUnit: item.defaultDaysPerUnit,
    },
    overrideLaborDays: item.overrideLaborDays,
  })), distanceFactor, difficultyFactor });

  useEffect(() => {
    reviewQuoteDraft({
      items: result.items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unit: i.unit,
        lineTotal: i.lineTotal,
      })),
      totalAmount: result.total,
      areaPyeong,
    }).then((res) => {
      if (res.ok) {
        setAiBullets(res.data.bullets);
      } else {
        setAiError(true);
      }
      setAiLoading(false);
    }).catch(() => {
      setAiError(true);
      setAiLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleConfirm() {
    startTransition(async () => {
      const saveRes = await saveQuoteDraft({
        siteId,
        items,
        distanceFactor,
        difficultyFactor,
      });
      if (!saveRes.ok) {
        setError(saveRes.error);
        setShowConfirmDialog(false);
        return;
      }

      const confirmRes = await confirmQuote(saveRes.data.quoteId);
      if (!confirmRes.ok) {
        setError(confirmRes.error);
        setShowConfirmDialog(false);
        return;
      }

      // 잔금 스케줄 자동 생성 — 반드시 await (트랜지션 종료/네비게이션에 잘려나가지 않도록).
      // 실패해도 견적 확정은 유지하고, 사용자에게 수동 복구 경로를 안내한다.
      let scheduleFailed = false;
      try {
        const scheduleRes = await createPaymentSchedule({
          siteId,
          quoteId: saveRes.data.quoteId,
          totalAmount: saveRes.data.total,
          siteName: siteName ?? "현장",
        });
        if (!scheduleRes.ok) scheduleFailed = true;
      } catch {
        scheduleFailed = true;
      }

      if (scheduleFailed) {
        setScheduleWarning(
          "잔금 일정 자동 생성에 실패했어요. 견적은 확정되었으니 '받을 돈' 화면에서 수동으로 추가해 주세요."
        );
      }

      onConfirmed(saveRes.data.quoteId, saveRes.data.total);
    });
  }

  return (
    <div className="px-4 pt-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">견적 확인</h2>
      <p className="text-lg text-gray-500 mb-6">금액을 확인하고 확정하세요</p>

      {/* AI 검토 패널 */}
      <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <SparklesIcon size={16} className="text-primary" />
          <span className="text-sm font-semibold text-primary/90">AI 견적 검토</span>
        </div>
        {aiLoading ? (
          <p className="text-sm text-blue-500 animate-pulse">AI가 견적을 검토 중이에요...</p>
        ) : aiError ? (
          <p className="text-sm text-gray-400">AI 검토를 일시적으로 이용할 수 없어요. 견적 확정은 정상 진행됩니다.</p>
        ) : aiBullets && aiBullets.length > 0 ? (
          <ul className="space-y-1">
            {aiBullets.map((b, i) => (
              <li key={i} className="text-sm text-blue-800 flex gap-1.5">
                <span className="text-blue-400 shrink-0">·</span>{b}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-primary">✅ 특이사항 없음 — 견적이 적정해 보여요</p>
        )}
      </div>

      {/* 항목별 내역 */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
        {result.items.map((item) => (
          <div key={`${item.tradeId}-${item.description}`} className="px-4 py-3 border-b border-gray-100 last:border-0">
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-4">
                <p className="text-base font-medium text-gray-800">{item.description}</p>
                <p className="text-sm text-gray-400">
                  {item.quantity}{item.unit} · 자재 {formatKRW(item.materialCost)} · 인건비 {formatKRW(item.laborCost)}
                </p>
              </div>
              <p className="text-base font-semibold text-gray-900 whitespace-nowrap">
                {formatKRW(item.lineTotal)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 합계 */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex justify-between text-base text-gray-600 mb-1">
          <span>소계</span>
          <span>{formatKRW(result.subtotal)}</span>
        </div>
        <div className="flex justify-between text-base text-gray-600 mb-1">
          <span>거리/난이도 계수</span>
          <span>×{(distanceFactor * difficultyFactor).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-base text-gray-600 mb-1">
          <span>예비 (20%)</span>
          <span>+{formatKRW(result.reserve)}</span>
        </div>
        <div className="flex justify-between text-base text-gray-600 mb-3">
          <span>비상 (10%)</span>
          <span>+{formatKRW(result.contingency)}</span>
        </div>
        <div className="flex justify-between items-baseline border-t border-gray-300 pt-3">
          <span className="text-xl font-bold text-gray-900">합계</span>
          <span className="text-3xl font-black text-primary/90">{formatKRW(result.total)}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-loss/30 rounded-xl p-3 mb-4 text-base text-loss">
          {error}
        </div>
      )}

      {scheduleWarning && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-4 flex gap-3">
          <AlertTriangleIcon size={24} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-base text-amber-800">{scheduleWarning}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-4 text-lg border border-gray-300 rounded-xl text-gray-600 font-medium active:bg-gray-100"
        >
          ◀ 다시 볼게요
        </button>
        <button
          onClick={() => setShowConfirmDialog(true)}
          className="flex-1 py-4 text-lg bg-primary text-white rounded-xl font-bold active:bg-primary/90"
        >
          이 금액으로 확정
        </button>
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangleIcon size={28} className="text-amber-500 shrink-0" />
              <h3 className="text-xl font-bold text-gray-900">견적을 확정할까요?</h3>
            </div>
            <p className="text-lg text-gray-600 mb-2">
              확정 후에는 수정이 불가합니다.
            </p>
            <p className="text-2xl font-black text-primary/90 mb-6">
              {formatKRW(result.total)}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={isPending}
                className="flex-1 py-4 text-lg border border-gray-300 rounded-xl text-gray-600 active:bg-gray-100"
              >
                아니요
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="flex-1 py-4 text-lg bg-primary text-white rounded-xl font-bold disabled:opacity-50 active:bg-primary/90"
              >
                {isPending ? "확정 중..." : "네, 확정"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
