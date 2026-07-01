"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordAttendance, type WorkerSite } from "./actions";

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

export function AttendanceForm({
  workerId,
  workerName,
  defaultDayRate,
  sites,
}: {
  workerId: string;
  workerName: string;
  defaultDayRate: number;
  sites: WorkerSite[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [siteId, setSiteId] = useState<string>(sites[0]?.id ?? "");
  const [workDate, setWorkDate] = useState<string>(todayStr());
  const [dayRate, setDayRate] = useState<string>(
    defaultDayRate > 0 ? String(defaultDayRate) : ""
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleSubmit() {
    if (!siteId) {
      setFeedback("현장을 선택해주세요");
      return;
    }
    const rate = Number(dayRate);
    if (!rate || rate <= 0) {
      setFeedback("일당을 확인해주세요");
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const res = await recordAttendance(workerId, siteId, workDate, rate);
      if (res.ok) {
        setDone(true);
        router.refresh();
        setTimeout(() => {
          setDone(false);
          setOpen(false);
        }, 1200);
      } else {
        setFeedback(res.error);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-1 items-center justify-center rounded-xl bg-primary py-4 text-base font-bold text-white active:bg-primary/90"
      >
        + 오늘 출역 기록
      </button>
    );
  }

  return (
    <div className="mt-1 w-full rounded-xl bg-muted p-4">
      <p className="mb-3 text-sm font-bold text-foreground/90">{workerName} 출역 기록</p>

      {done ? (
        <p className="rounded-lg bg-green-100 px-3 py-3 text-center text-base font-bold text-profit">
          기록 완료 ✅
        </p>
      ) : (
        <>
          <label className="mb-1 block text-sm font-bold text-muted-foreground">현장</label>
          {sites.length === 0 ? (
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              진행 중인 현장이 없습니다
            </p>
          ) : (
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="mb-3 h-14 w-full rounded-xl border border-border bg-card px-4 text-base font-medium"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          <label className="mb-1 block text-sm font-bold text-muted-foreground">날짜</label>
          <input
            type="date"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
            className="mb-3 h-14 w-full rounded-xl border border-border bg-card px-4 text-base font-medium"
          />

          <label className="mb-1 block text-sm font-bold text-muted-foreground">일당</label>
          <input
            type="number"
            inputMode="numeric"
            value={dayRate}
            onChange={(e) => setDayRate(e.target.value)}
            placeholder="일당 (원)"
            className="mb-3 h-14 w-full rounded-xl border border-border bg-card px-4 text-lg font-bold"
          />

          {feedback && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-loss">
              {feedback}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || sites.length === 0}
              className="flex h-14 flex-1 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white disabled:opacity-50 active:bg-primary/90"
            >
              {isPending ? "기록 중..." : "기록하기"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setFeedback(null);
              }}
              className="flex h-14 flex-1 items-center justify-center rounded-xl bg-muted text-lg font-bold text-foreground/90 active:bg-muted/60"
            >
              취소
            </button>
          </div>
        </>
      )}
    </div>
  );
}
