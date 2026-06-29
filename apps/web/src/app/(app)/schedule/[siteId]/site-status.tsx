"use client";

import { useState, useTransition } from "react";
import { updateSiteStatus } from "./actions";
import { useRouter } from "next/navigation";
import { AlertTriangleIcon, CheckCircleIcon, PlayCircleIcon } from "lucide-react";

interface Props {
  siteId: string;
  currentStatus: string;
  /** 본문 하단용 큰 버튼 (발견성 향상). 기본은 헤더용 작은 버튼 */
  variant?: "header" | "block";
}

const NEXT_STATUS: Record<
  string,
  {
    next: "in_progress" | "done";
    label: string;
    color: string;
    confirmTitle: string;
    confirmDesc: string;
    confirmCta: string;
    confirmColor: string;
  }
> = {
  contracted: {
    next: "in_progress",
    label: "공사 시작",
    color: "bg-green-600 text-white",
    confirmTitle: "이 현장을 공사 시작으로 바꿀까요?",
    confirmDesc: "공사 시작으로 바꾸면 현장 상태가 '공사중'으로 표시돼요.",
    confirmCta: "네, 공사 시작합니다",
    confirmColor: "bg-green-600",
  },
  in_progress: {
    next: "done",
    label: "공사 완료",
    color: "bg-gray-700 text-white",
    confirmTitle: "이 현장을 공사 완료로 바꿀까요?",
    confirmDesc: "공사 완료로 바꾸면 현장 상태가 '완료'로 표시돼요. 잘못 눌렀다면 '아니요'를 눌러주세요.",
    confirmCta: "네, 공사 완료합니다",
    confirmColor: "bg-gray-800",
  },
};

export function SiteStatusButton({ siteId, currentStatus, variant = "header" }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();
  const next = NEXT_STATUS[currentStatus];
  if (!next) return null;

  const isDone = next.next === "done";

  function handleConfirm() {
    startTransition(async () => {
      await updateSiteStatus(siteId, next.next);
      setShowConfirm(false);
      router.refresh();
    });
  }

  return (
    <>
      {variant === "block" ? (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isPending}
          className={`flex items-center justify-center gap-2 w-full rounded-2xl py-5 text-xl font-bold disabled:opacity-50 ${next.color}`}
        >
          {isDone ? <CheckCircleIcon size={24} /> : <PlayCircleIcon size={24} />}
          {next.label}
        </button>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isPending}
          className={`px-3 py-2 rounded-xl text-base font-semibold disabled:opacity-50 ${next.color}`}
        >
          {next.label}
        </button>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 pb-8">
            <div className="text-center mb-6">
              {isDone ? (
                <CheckCircleIcon size={48} className="mx-auto text-gray-700 mb-3" />
              ) : (
                <AlertTriangleIcon size={48} className="mx-auto text-green-600 mb-3" />
              )}
              <h3 className="text-2xl font-bold text-gray-900">{next.confirmTitle}</h3>
              <p className="text-base text-gray-500 mt-2">{next.confirmDesc}</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className={`w-full text-white rounded-2xl py-5 text-xl font-bold disabled:opacity-50 ${next.confirmColor}`}
              >
                {isPending ? "변경 중..." : next.confirmCta}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="w-full bg-gray-100 text-gray-700 rounded-2xl py-4 text-lg font-medium disabled:opacity-50"
              >
                아니요, 그대로 둘게요
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
