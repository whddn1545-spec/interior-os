"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarIcon } from "lucide-react";
import { generateScheduleFromQuote } from "./actions";

interface Props {
  siteId: string;
  confirmedQuoteId: string | null;
}

export function ScheduleSetup({ siteId, confirmedQuoteId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    if (!confirmedQuoteId) return;
    startTransition(async () => {
      const result = await generateScheduleFromQuote(siteId, confirmedQuoteId, startDate);
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  if (!confirmedQuoteId) {
    return (
      <div className="text-center py-16">
        <CalendarIcon size={64} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">일정이 없어요</h2>
        <p className="text-base text-gray-500 mb-6">
          확정된 견적서가 있어야 일정을 자동으로 만들 수 있어요
        </p>
        <Link
          href="/quotes/new"
          className="inline-block bg-primary text-white rounded-2xl px-8 py-4 text-lg font-semibold active:bg-primary/90"
        >
          새 견적 만들기
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center py-8 mb-6">
        <CalendarIcon size={64} className="mx-auto text-blue-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">공사 일정 자동 생성</h2>
        <p className="text-base text-gray-500">
          확정된 견적을 바탕으로 공종별 일정을 자동으로 만들어드려요.<br/>
          선후행 관계와 예비 일정도 자동 포함됩니다.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-4">
        <label className="block text-lg font-semibold text-gray-800 mb-3">
          🗓 공사 시작일
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="w-full border border-gray-200 rounded-xl px-4 py-4 text-xl font-medium text-gray-900 focus:outline-none focus:border-blue-400"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-loss/30 rounded-xl px-4 py-3 text-loss mb-4">
          {error}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={isPending}
        className="w-full bg-primary text-white rounded-2xl py-5 text-xl font-bold disabled:opacity-50 active:bg-primary/90"
      >
        {isPending ? "일정 생성 중..." : "🚀 일정 자동 생성"}
      </button>
      <p className="text-sm text-gray-500 text-center mt-3">
        생성 후 날짜를 직접 조정할 수 있어요
      </p>
    </div>
  );
}
