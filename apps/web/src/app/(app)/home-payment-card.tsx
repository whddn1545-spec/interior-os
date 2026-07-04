"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { markPaid } from "./payments/actions";

interface Props {
  scheduleId: string;
  customerName: string;
  stageLabel: string;
  amount: number;
  dueDate: string | null;
  isOverdue: boolean;
}

/**
 * 홈 '받을 돈' 카드 — 입금 확인을 홈에서 원탭으로.
 * 금액이 걸린 동작이라 실수 방지용 확인 단계를 한 번 거친다.
 */
export function HomePaymentCard({ scheduleId, customerName, stageLabel, amount, dueDate, isOverdue }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleConfirmPaid() {
    startTransition(async () => {
      const res = await markPaid(scheduleId, amount);
      if (res.ok) {
        toast.success(`${customerName}님 ${stageLabel} 입금 처리됐어요`, {
          description: `${amount.toLocaleString("ko-KR")}원`,
        });
        setConfirming(false);
        router.refresh();
      } else {
        toast.error(res.error);
        setConfirming(false);
      }
    });
  }

  return (
    <div
      className={`bg-card rounded-2xl px-5 py-4 ${isOverdue ? "border-2 border-loss" : "border border-loss/30"}`}
    >
      <Link href="/payments" className="flex items-center justify-between active:opacity-80">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {isOverdue && (
              <span className="text-xs font-bold text-loss-foreground bg-loss px-2 py-0.5 rounded-full shrink-0">
                연체
              </span>
            )}
            <p className="text-xl font-bold text-foreground truncate">{customerName}</p>
          </div>
          <p className="text-base text-muted-foreground">
            {stageLabel}
            {dueDate ? ` · 약정일 ${dueDate}` : ""}
          </p>
        </div>
        <p className="text-2xl font-black text-loss tabular-nums shrink-0 ml-3">
          {amount.toLocaleString("ko-KR")}원
        </p>
      </Link>

      {confirming ? (
        <div className="mt-3 rounded-xl bg-muted p-4">
          <p className="text-base font-bold text-foreground mb-3">
            {amount.toLocaleString("ko-KR")}원 받으셨어요?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirmPaid}
              disabled={isPending}
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-profit text-base font-bold text-white disabled:opacity-50"
            >
              {isPending ? "처리 중..." : "네, 받았어요"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={isPending}
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-card border border-border text-base font-bold text-foreground/90"
            >
              아니요
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 flex w-full items-center justify-center min-h-12 rounded-xl bg-profit/12 text-profit text-[17px] font-bold active:bg-profit/20"
        >
          ✅ 받았어요
        </button>
      )}
    </div>
  );
}
