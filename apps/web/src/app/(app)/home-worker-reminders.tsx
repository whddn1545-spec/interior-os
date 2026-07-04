"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendWorkerReminder, type TomorrowReminder } from "./reminder-actions";

/**
 * 홈 '내일 공사' 위젯 — 작업자에게 리마인드 문자를 원탭으로 보낸다 (노쇼 방지).
 * 발송 버튼을 눌러야만 나가므로 사람 확정 게이트가 유지된다.
 */
export function HomeWorkerReminders({ reminders }: { reminders: TomorrowReminder[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sendingTaskId, setSendingTaskId] = useState<string | null>(null);

  if (reminders.length === 0) return null;

  function handleSend(item: TomorrowReminder) {
    setSendingTaskId(item.taskId);
    startTransition(async () => {
      const res = await sendWorkerReminder(item.taskId);
      setSendingTaskId(null);
      if (res.ok) {
        toast.success(`${item.workerName ?? "작업자"}님에게 내일 작업 문자를 보냈어요`, {
          description: `${item.siteName} · ${item.taskTitle}`,
        });
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <section>
      <h2 className="text-xl font-bold text-foreground mb-3">🌙 내일 공사 — 작업자 확인</h2>
      <div className="space-y-2">
        {reminders.map((item) => (
          <div key={item.taskId} className="bg-card border border-border rounded-2xl px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xl font-bold text-foreground truncate">{item.siteName}</p>
                <p className="text-base text-muted-foreground truncate">
                  {item.taskTitle}
                  {item.workerName ? ` · 👷 ${item.workerName}` : ""}
                </p>
              </div>
            </div>

            {item.workerName ? (
              item.reminded ? (
                <p className="mt-3 flex items-center justify-center min-h-12 rounded-xl bg-profit/10 text-profit text-[17px] font-bold">
                  ✅ 문자 보냈어요
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSend(item)}
                  disabled={isPending}
                  className="mt-3 flex w-full items-center justify-center min-h-12 rounded-xl bg-primary text-white text-[17px] font-bold active:opacity-90 disabled:opacity-50"
                >
                  {sendingTaskId === item.taskId
                    ? "보내는 중..."
                    : `📱 ${item.workerName}님에게 내일 작업 문자 보내기`}
                </button>
              )
            ) : (
              <Link
                href={`/schedule/${item.siteId}?from=/`}
                className="mt-3 flex w-full items-center justify-center min-h-12 rounded-xl bg-warning/15 text-warning-foreground text-[17px] font-bold active:bg-warning/25"
              >
                ⚠️ 작업자 미배정 — 지금 배정하기
              </Link>
            )}
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground mt-2 text-center">
        전날 미리 알려주면 노쇼가 크게 줄어요
      </p>
    </section>
  );
}
