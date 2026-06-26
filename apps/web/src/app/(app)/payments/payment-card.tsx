"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markPaid, sendPaymentReminder, type PaymentBoardItem } from "./actions";

const STAGE_BADGE: Record<string, { label: string; cls: string }> = {
  deposit: { label: "계약금", cls: "bg-emerald-100 text-emerald-800" },
  midterm: { label: "중도금", cls: "bg-indigo-100 text-indigo-800" },
  balance: { label: "잔금", cls: "bg-amber-100 text-amber-800" },
};

const TONES = [
  { key: "polite", label: "정중하게" },
  { key: "firm", label: "확실하게" },
  { key: "final", label: "최후통첩" },
] as const;

function daysUntil(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(`${dueDate}T00:00:00Z`).getTime();
  return Math.round((due - today) / (24 * 60 * 60 * 1000));
}

export function PaymentCard({ schedule }: { schedule: PaymentBoardItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPaidForm, setShowPaidForm] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [paidAmount, setPaidAmount] = useState<string>(String(schedule.amount));
  const [feedback, setFeedback] = useState<string | null>(null);

  const stage = STAGE_BADGE[schedule.stage] ?? { label: schedule.stageLabel, cls: "bg-gray-100 text-gray-700" };
  const dDays = daysUntil(schedule.dueDate);

  const borderCls =
    schedule.urgency === "overdue"
      ? "border-red-400 border-2"
      : schedule.urgency === "soon"
        ? "border-orange-400 border-2"
        : "border-gray-200 border";

  function handleMarkPaid() {
    const amount = Number(paidAmount);
    if (!amount || amount <= 0) {
      setFeedback("금액을 확인해주세요");
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const res = await markPaid(schedule.id, amount);
      if (res.ok) {
        router.refresh();
      } else {
        setFeedback(res.error);
      }
    });
  }

  function handleReminder(tone: "polite" | "firm" | "final") {
    setFeedback(null);
    startTransition(async () => {
      const res = await sendPaymentReminder(schedule.id, tone);
      if (res.ok) {
        setShowReminders(false);
        setFeedback("독촉 문자를 발송했습니다 ✅");
      } else {
        setFeedback(res.error);
      }
    });
  }

  const dueDateStr = schedule.dueDate
    ? new Date(`${schedule.dueDate}T00:00:00Z`).toLocaleDateString("ko-KR", {
        timeZone: "UTC",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "약정일 미정";

  return (
    <div className={`relative rounded-2xl bg-white p-5 shadow-sm ${borderCls}`}>
      {/* 긴급도 배지 */}
      {schedule.urgency === "overdue" && (
        <span className="absolute right-4 top-4 rounded-full bg-red-600 px-3 py-1 text-sm font-bold text-white">
          ⚠️ 연체
        </span>
      )}
      {schedule.urgency === "soon" && dDays !== null && (
        <span className="absolute right-4 top-4 rounded-full bg-orange-500 px-3 py-1 text-sm font-bold text-white">
          {dDays === 0 ? "D-DAY" : `D-${dDays}`}
        </span>
      )}

      {/* 고객 / 현장 */}
      <p className="text-xl font-bold text-gray-900">{schedule.customerName}</p>
      <p className="text-base text-gray-600">{schedule.siteName}</p>

      {/* 단계 배지 */}
      <span className={`mt-3 inline-block rounded-md px-3 py-1 text-sm font-bold ${stage.cls}`}>
        {stage.label}
      </span>

      {/* 금액 */}
      <p className="mt-2 text-3xl font-black text-blue-700">
        {schedule.amount.toLocaleString("ko-KR")}원
      </p>

      {/* 약정일 */}
      <p className="mt-1 text-base text-gray-500">약정일: {dueDateStr}</p>

      {feedback && (
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
          {feedback}
        </p>
      )}

      {/* 입금 확인 인라인 폼 */}
      {showPaidForm && (
        <div className="mt-4 rounded-xl bg-gray-50 p-4">
          <label className="mb-2 block text-sm font-bold text-gray-700">입금 금액 확인</label>
          <input
            type="number"
            inputMode="numeric"
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            className="mb-3 h-14 w-full rounded-xl border border-gray-300 px-4 text-lg font-bold"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleMarkPaid}
              disabled={isPending}
              className="flex h-14 flex-1 items-center justify-center rounded-xl bg-green-600 text-lg font-bold text-white disabled:opacity-50"
            >
              {isPending ? "처리 중..." : "확인"}
            </button>
            <button
              type="button"
              onClick={() => setShowPaidForm(false)}
              className="flex h-14 flex-1 items-center justify-center rounded-xl bg-gray-200 text-lg font-bold text-gray-700"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 독촉 문자 토글 */}
      {showReminders && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {TONES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => handleReminder(t.key)}
              disabled={isPending}
              className="flex h-14 items-center justify-center rounded-xl bg-gray-100 px-2 text-base font-bold text-gray-800 disabled:opacity-50"
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* 액션 버튼 2개 */}
      {!showPaidForm && (
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setShowReminders(false);
              setShowPaidForm(true);
            }}
            className="flex flex-1 items-center justify-center rounded-xl bg-green-600 py-4 text-lg font-bold text-white"
          >
            ✅ 받았어요
          </button>
          <button
            type="button"
            onClick={() => setShowReminders((v) => !v)}
            className="flex flex-1 items-center justify-center rounded-xl bg-blue-600 py-4 text-lg font-bold text-white"
          >
            📱 독촉 문자
          </button>
        </div>
      )}
    </div>
  );
}
