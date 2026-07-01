import {
  getWorkerAttendanceBoard,
  getWorkerSites,
  getCurrentMonth,
  getCurrentMonthLabel,
} from "./actions";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { WorkerCard } from "./worker-card";
import { HelpButton } from "@/components/tutorial/HelpButton";

export const dynamic = "force-dynamic";

export default async function WorkerAttendancePage() {
  const [boardRes, sitesRes, month, monthLabel] = await Promise.all([
    getWorkerAttendanceBoard(),
    getWorkerSites(),
    getCurrentMonth(),
    getCurrentMonthLabel(),
  ]);

  const workers = boardRes.ok ? boardRes.data : [];
  const sites = sitesRes.ok ? sitesRes.data : [];
  const error = boardRes.ok ? null : boardRes.error;

  // 이번달 총 지급예정 = 모든 작업자 잔액 합
  const totalDue = workers.reduce((sum, w) => sum + w.balance, 0);

  return (
    <div className="min-h-screen bg-muted pb-24">
      <header className="sticky top-0 bg-card border-b border-border z-10 px-4 py-3 flex items-center gap-3">
        <Link href="/workers" className="p-3 -ml-3 text-muted-foreground">
          <ArrowLeftIcon size={24} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground">작업자 장부</h1>
          <p className="text-sm text-muted-foreground">{monthLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground/70">이번달 지급예정</p>
          <p className="text-lg font-black text-orange-600">{totalDue.toLocaleString("ko-KR")}원</p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 py-6">

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-loss">
          {error}
        </p>
      )}

      {workers.length === 0 ? (
        <div className="px-4 py-16 text-center text-muted-foreground/70">
          <p className="mb-2 text-xl">등록된 작업자가 없어요</p>
          <p className="text-base">작업자를 추가하면 출역을 기록할 수 있어요</p>
          <Link
            href="/workers/new"
            className="mt-4 inline-flex min-h-[56px] items-center justify-center rounded-xl bg-orange-600 px-6 py-4 text-base font-bold text-white active:bg-orange-700"
          >
            작업자 추가하기 →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {workers.map((w) => (
            <li key={w.id}>
              <WorkerCard
                worker={w}
                month={month}
                monthLabel={monthLabel}
                sites={sites}
              />
            </li>
          ))}
        </ul>
      )}

      <HelpButton tutorialKey="workers" />
      </div>
    </div>
  );
}
