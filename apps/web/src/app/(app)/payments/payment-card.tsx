"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { markPaid, sendPaymentReminder, type PaymentBoardItem, type ReminderDraft } from "./actions";

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
  const [draft, setDraft] = useState<ReminderDraft | null>(null);

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
        toast.success(
          `${schedule.customerName}님 ${stage.label} 입금 처리됐어요`,
          { description: `${amount.toLocaleString("ko-KR")}원` }
        );
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
        setDraft(res.data);
        toast.success("문자 내용을 만들었어요", {
          description: "아래에서 복사하거나 문자 앱으로 보내주세요",
        });
      } else {
        setFeedback(res.error);
      }
    });
  }

  async function handleCopyDraft() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft.body);
      toast.success("문자 내용을 복사했어요", {
        description: "문자 앱에 붙여넣어 보내주세요",
      });
    } catch {
      toast.error("복사하지 못했어요. 아래 내용을 길게 눌러 복사해주세요.");
    }
  }

  const smsHref = draft
    ? `sms:${draft.phone}${draft.phone ? "?" : ""}body=${encodeURIComponent(draft.body)}`
    : null;

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
        <span className="absolute right-4 top-4 rounded-full bg-loss px-3 py-1 text-sm font-bold text-white">
          ⚠️ 연체
        </span>
      )}
      {schedule.urgency === "soon" && dDays !== null && (
        <span className="absolute right-4 top-4 rounded-full bg-orange-500 px-3 py-1 text-sm font-bold text-white">
          {dDays === 0 ? "D-DAY" : `D-${dDays}`}
        </span>
      )}

      {/* 고객 / 현장 */}
      <Link
        href={`/sites/${schedule.siteId}?from=/payments`}
        className="block group -mx-1 px-1 py-2 rounded-xl active:bg-primary/10"
      >
        <p className="text-xl font-bold text-gray-900">{schedule.customerName}</p>
        <p className="text-base text-primary underline decoration-blue-200">{schedule.siteName} →</p>
      </Link>

      {/* 단계 배지 */}
      <span className={`mt-3 inline-block rounded-md px-3 py-1 text-sm font-bold ${stage.cls}`}>
        {stage.label}
      </span>

      {/* 금액 */}
      <p className="mt-2 text-3xl font-black text-primary/90">
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
              className="flex h-14 flex-1 items-center justify-center rounded-xl bg-profit text-lg font-bold text-white disabled:opacity-50"
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
        <div className="mt-4">
          <p className="mb-2 text-base font-bold text-gray-700">
            어떤 말투로 만들까요?
          </p>
          <div className="grid grid-cols-3 gap-2">
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
        </div>
      )}

      {/* 생성된 문자 초안 — 실제 발송이 아니라 사용자가 문자 앱에서 직접 보냄 */}
      {draft && (
        <div className="mt-4 rounded-xl border-2 border-primary/30 bg-primary/10 p-4">
          <p className="text-base font-bold text-blue-900">
            문자 내용을 만들었어요 — 문자 앱에서 보내주세요
          </p>
          <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-3 text-base leading-relaxed text-gray-800">
            {draft.body}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {smsHref && (
              <a
                href={smsHref}
                className="flex items-center justify-center rounded-xl bg-primary py-4 text-lg font-bold text-white"
              >
                📱 문자 앱으로 보내기
              </a>
            )}
            <button
              type="button"
              onClick={handleCopyDraft}
              className="flex items-center justify-center rounded-xl bg-gray-200 py-4 text-lg font-bold text-gray-800"
            >
              📋 문자 내용 복사
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="flex items-center justify-center rounded-xl bg-white py-4 text-base font-bold text-gray-500"
            >
              닫기
            </button>
          </div>
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
            className="flex flex-1 items-center justify-center rounded-xl bg-profit py-4 text-lg font-bold text-white"
          >
            ✅ 받았어요
          </button>
          <button
            type="button"
            onClick={() =>
              setShowReminders((v) => {
                if (!v) setDraft(null);
                return !v;
              })
            }
            className="flex flex-1 items-center justify-center rounded-xl bg-primary py-4 text-lg font-bold text-white"
          >
            📱 독촉 문자 만들기
          </button>
        </div>
      )}
    </div>
  );
}
