"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { applyDelayShift } from "./actions";

interface Props {
  siteId: string;
  overdueTitle: string;
  delayDays: number;
  /** 밀리는 후속 작업 수 (기준 작업 제외) */
  followingCount: number;
}

/** 밀린 일정 경고 + 원탭 재계산 배너 */
export function DelayBanner({ siteId, overdueTitle, delayDays, followingCount }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleShift() {
    startTransition(async () => {
      const res = await applyDelayShift(siteId);
      if (res.ok) {
        toast.success(`일정을 ${res.data.delayDays}일씩 다시 잡았어요`, {
          description: `${res.data.movedCount}개 작업의 날짜가 바뀌었어요`,
        });
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto bg-card rounded-2xl border-2 border-warning/60 p-5 mb-4">
      <p className="text-lg font-bold text-foreground">
        ⚠️ &lsquo;{overdueTitle}&rsquo; 작업이 {delayDays}일 밀렸어요
      </p>
      <p className="text-base text-muted-foreground mt-1">
        {followingCount > 0
          ? `뒤에 오는 작업 ${followingCount}개도 함께 ${delayDays}일씩 밀어서 다시 잡아드릴까요? 작업자에게 바뀐 날짜를 알려주는 걸 잊지 마세요.`
          : `이 작업의 종료일을 오늘로 다시 잡아드릴까요?`}
      </p>
      <button
        type="button"
        onClick={handleShift}
        disabled={isPending}
        className="mt-3 flex w-full items-center justify-center min-h-12 rounded-xl bg-warning text-warning-foreground text-[17px] font-bold active:opacity-90 disabled:opacity-50"
      >
        {isPending ? "다시 잡는 중..." : `📅 일정 ${delayDays}일씩 다시 잡기`}
      </button>
    </div>
  );
}
