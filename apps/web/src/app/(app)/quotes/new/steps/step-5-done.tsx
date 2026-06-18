"use client";

import Link from "next/link";
import { formatKRW } from "@interior-os/core/pricing";
import { CheckCircleIcon } from "lucide-react";

interface Props {
  quoteId: string;
  total: number;
}

export function Step5Done({ quoteId, total }: Props) {
  return (
    <div className="px-4 pt-12 flex flex-col items-center text-center">
      <CheckCircleIcon size={80} className="text-green-500 mb-6" />

      <h2 className="text-3xl font-bold text-gray-900 mb-2">견적이 완성됐어요!</h2>
      <p className="text-xl text-gray-500 mb-2">확정 금액</p>
      <p className="text-4xl font-black text-blue-700 mb-10">{formatKRW(total)}</p>

      <div className="w-full space-y-3">
        <Link
          href={`/quotes/${quoteId}`}
          className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white rounded-2xl py-5 text-xl font-bold"
        >
          📄 견적서 보기
        </Link>

        <Link
          href="/messages"
          className="flex items-center justify-center gap-2 w-full bg-white border-2 border-gray-200 text-gray-800 rounded-2xl py-5 text-xl font-semibold"
        >
          📱 고객에게 문자 보내기
        </Link>

        <Link
          href="/quotes/new"
          className="flex items-center justify-center gap-2 w-full bg-white border-2 border-gray-200 text-gray-600 rounded-2xl py-4 text-lg font-medium"
        >
          + 새 견적 만들기
        </Link>
      </div>
    </div>
  );
}
