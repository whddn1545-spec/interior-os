"use client";

import { useEffect } from "react";
import { AlertCircleIcon } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="px-4 pt-16 pb-24 flex flex-col items-center text-center">
      <AlertCircleIcon size={56} className="text-red-400 mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">문제가 생겼어요</h2>
      <p className="text-lg text-gray-500 mb-8">
        잠깐 오류가 발생했어요.
        <br />
        아래 버튼을 눌러 다시 시도해보세요.
      </p>
      <button
        onClick={reset}
        className="bg-blue-600 text-white text-xl font-bold rounded-2xl px-10 py-5 active:bg-blue-700"
      >
        다시 시도
      </button>
    </div>
  );
}
