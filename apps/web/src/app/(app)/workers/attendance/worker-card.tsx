"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markWorkerPaid,
  type AttendanceBoardWorker,
  type WorkerSite,
} from "./actions";
import { AttendanceForm } from "./attendance-form";

function buildStatementMessage(
  worker: AttendanceBoardWorker,
  monthLabel: string
): string {
  const lines = [
    `[${monthLabel} 정산 명세] ${worker.name}님`,
    "",
    `출역: ${worker.daysWorked}일`,
    `일당: ${worker.dayRate.toLocaleString("ko-KR")}원`,
    `줄 돈: ${worker.totalEarned.toLocaleString("ko-KR")}원`,
    `준 돈: ${worker.totalPaid.toLocaleString("ko-KR")}원`,
    `잔액: ${worker.balance.toLocaleString("ko-KR")}원`,
  ];
  return lines.join("\n");
}

export function WorkerCard({
  worker,
  month,
  monthLabel,
  sites,
}: {
  worker: AttendanceBoardWorker;
  month: string;
  monthLabel: string;
  sites: WorkerSite[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const unsettled = worker.balance > 0;

  function handleMarkPaid() {
    if (worker.balance <= 0) {
      setFeedback("정산할 금액이 없어요");
      return;
    }
    setShowConfirm(true);
  }

  function confirmMarkPaid() {
    setShowConfirm(false);
    setFeedback(null);
    startTransition(async () => {
      const res = await markWorkerPaid(worker.id, month);
      if (res.ok) {
        router.refresh();
        setFeedback("정산이 완료됐어요 ✅");
      } else {
        setFeedback(res.error);
      }
    });
  }

  async function handleCopyStatement() {
    const msg = buildStatementMessage(worker, monthLabel);
    try {
      await navigator.clipboard.writeText(msg);
      setFeedback("정산 명세를 복사했어요 📋");
    } catch {
      setFeedback("복사에 실패했어요");
    }
  }

  return (
    <div
      className={`rounded-2xl bg-white p-5 shadow-sm ${
        unsettled ? "border-2 border-orange-300" : "border border-gray-200"
      }`}
    >
      {/* 이름 / 전화 */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xl font-bold text-gray-900">{worker.name}</p>
        {worker.phone && (
          <a
            href={`tel:${worker.phone}`}
            className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1.5 rounded-xl text-sm font-semibold shrink-0"
          >
            📞 전화
          </a>
        )}
      </div>

      {/* 출역 / 일당 배지 */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-md bg-gray-100 px-3 py-1 text-sm font-bold text-gray-700">
          {worker.daysWorked}일 출역
        </span>
        <span className="rounded-md bg-gray-100 px-3 py-1 text-sm font-bold text-gray-700">
          일당 {worker.dayRate.toLocaleString("ko-KR")}원
        </span>
      </div>

      {/* 금액 요약 */}
      <div className="mt-4 space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-gray-500">줄 돈</span>
          <span
            className={`text-2xl font-black ${
              unsettled ? "text-orange-600" : "text-gray-900"
            }`}
          >
            {worker.totalEarned.toLocaleString("ko-KR")}원
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-gray-500">준 돈</span>
          <span className="text-base font-bold text-gray-700">
            {worker.totalPaid.toLocaleString("ko-KR")}원
          </span>
        </div>
        <div className="flex items-baseline justify-between border-t border-gray-100 pt-1">
          <span className="text-sm text-gray-500">잔액</span>
          <span
            className={`text-xl font-black ${
              unsettled ? "text-orange-600" : "text-green-600"
            }`}
          >
            {worker.balance.toLocaleString("ko-KR")}원
          </span>
        </div>
      </div>

      {feedback && (
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
          {feedback}
        </p>
      )}

      {/* 출역 기록 폼 */}
      <div className="mt-4 flex">
        <AttendanceForm
          workerId={worker.id}
          workerName={worker.name}
          defaultDayRate={worker.dayRate}
          sites={sites}
        />
      </div>

      {/* 정산 확인 */}
      {showConfirm && (
        <div className="mt-3 bg-green-50 border border-green-200 rounded-2xl p-4">
          <p className="text-base font-semibold text-green-900 mb-1">
            {worker.name}님 정산을 완료할까요?
          </p>
          <p className="text-sm text-green-700 mb-3">
            잔액 {worker.balance.toLocaleString("ko-KR")}원이 정산 완료돼요.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 text-base font-medium active:bg-gray-100">아니요</button>
            <button onClick={confirmMarkPaid} disabled={isPending} className="flex-1 py-3 rounded-xl bg-green-600 text-white text-base font-bold disabled:opacity-50 active:bg-green-700">네, 완료</button>
          </div>
        </div>
      )}

      {/* 정산 / 명세 버튼 */}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleMarkPaid}
          disabled={isPending || worker.balance <= 0}
          className="flex flex-1 items-center justify-center rounded-xl bg-green-600 py-3.5 text-base font-bold text-white disabled:opacity-40 active:bg-green-700"
        >
          {isPending ? "처리 중..." : "정산 완료"}
        </button>
        <button
          type="button"
          onClick={handleCopyStatement}
          className="flex flex-1 items-center justify-center rounded-xl bg-blue-600 py-3.5 text-base font-bold text-white active:bg-blue-700"
        >
          정산 명세 문자
        </button>
      </div>
    </div>
  );
}
