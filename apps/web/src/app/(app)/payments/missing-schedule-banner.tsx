"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangleIcon } from "lucide-react";
import { createPaymentSchedule, type MissingScheduleQuote } from "./actions";

export function MissingScheduleBanner({ quotes }: { quotes: MissingScheduleQuote[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (quotes.length === 0) return null;

  function handleGenerate(quote: MissingScheduleQuote) {
    setError(null);
    setPendingId(quote.quoteId);
    startTransition(async () => {
      const res = await createPaymentSchedule({
        siteId: quote.siteId,
        quoteId: quote.quoteId,
        totalAmount: quote.totalAmount,
        siteName: quote.siteName,
      });
      setPendingId(null);
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="mb-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
      <div className="mb-3 flex items-start gap-3">
        <AlertTriangleIcon size={28} className="mt-0.5 shrink-0 text-amber-500" />
        <div>
          <p className="text-lg font-bold text-amber-900">잔금 일정이 없는 확정 견적이 있어요</p>
          <p className="mt-1 text-base text-amber-800">
            아래 견적은 잔금 일정이 만들어지지 않았어요. 버튼을 누르면 계약금·중도금·잔금으로
            나눠서 받을 돈에 추가됩니다.
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-base text-red-700">{error}</p>
      )}

      <div className="flex flex-col gap-3">
        {quotes.map((q) => (
          <div
            key={q.quoteId}
            className="rounded-xl border border-amber-200 bg-white p-4"
          >
            <p className="text-lg font-bold text-gray-900">{q.customerName}</p>
            <p className="text-base text-gray-600">{q.siteName}</p>
            <p className="mt-1 text-xl font-black text-blue-700">
              {q.totalAmount.toLocaleString("ko-KR")}원
            </p>
            <button
              type="button"
              onClick={() => handleGenerate(q)}
              disabled={isPending}
              className="mt-3 flex w-full items-center justify-center rounded-xl bg-amber-600 py-4 text-lg font-bold text-white disabled:opacity-50 active:bg-amber-700"
            >
              {pendingId === q.quoteId ? "추가하는 중..." : "잔금 일정 만들기"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
