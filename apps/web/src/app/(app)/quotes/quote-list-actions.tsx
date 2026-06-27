"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CopyIcon, Trash2Icon, AlertTriangleIcon } from "lucide-react";
import { deleteQuote, duplicateQuote } from "./[id]/actions";

interface Props {
  quoteId: string;
}

/** 견적 목록에서 임시저장 견적을 바로 복제/삭제하는 액션 (목록 누적 정리용) */
export function QuoteListActions({ quoteId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDuplicate() {
    setError(null);
    startTransition(async () => {
      const result = await duplicateQuote(quoteId);
      if (!result.ok) {
        setError(result.error);
      } else {
        router.push(`/quotes/${result.data.quoteId}`);
      }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteQuote(quoteId);
      if (!result.ok) {
        setError(result.error);
        setShowDeleteDialog(false);
      } else {
        setShowDeleteDialog(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-700 text-base">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleDuplicate}
          disabled={isPending}
          className="flex flex-1 items-center justify-center gap-1.5 bg-gray-100 text-gray-700 rounded-xl py-4 text-base font-semibold disabled:opacity-50"
        >
          <CopyIcon size={18} />
          {isPending ? "처리 중..." : "복제"}
        </button>
        <button
          type="button"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isPending}
          className="flex flex-1 items-center justify-center gap-1.5 bg-red-50 text-red-600 border border-red-200 rounded-xl py-4 text-base font-semibold disabled:opacity-50"
        >
          <Trash2Icon size={18} />
          삭제
        </button>
      </div>

      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 pb-8">
            <div className="text-center mb-6">
              <AlertTriangleIcon size={48} className="mx-auto text-red-500 mb-3" />
              <h3 className="text-2xl font-bold text-gray-900">이 견적을 삭제할까요?</h3>
              <p className="text-base text-gray-500 mt-2">
                삭제하면 이 임시저장 견적과 모든 항목이 완전히 지워져요. 되돌릴 수 없어요.
              </p>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="w-full bg-red-600 text-white rounded-2xl py-5 text-xl font-bold disabled:opacity-50"
              >
                {isPending ? "삭제 중..." : "네, 삭제합니다"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isPending}
                className="w-full bg-gray-100 text-gray-700 rounded-2xl py-4 text-lg font-medium disabled:opacity-50"
              >
                아니요, 그대로 둘게요
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
