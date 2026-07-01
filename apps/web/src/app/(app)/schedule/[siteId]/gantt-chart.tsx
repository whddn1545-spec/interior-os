"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTaskStatus } from "./actions";

interface TaskRow {
  id: string;
  title: string;
  tradeNameKo: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  kind: "work" | "reserve" | "contingency";
  status: string;
}

interface Props {
  tasks: TaskRow[];
  siteId: string;
  siteName: string;
}

const KIND_COLOR: Record<string, string> = {
  work: "bg-blue-500",
  reserve: "bg-amber-400",
  contingency: "bg-orange-400",
};

const STATUS_LABEL: Record<string, string> = {
  planned: "예정",
  active: "진행중",
  done: "완료",
  canceled: "취소",
};

export function GanttChart({ tasks, siteId, siteName }: Props) {
  const router = useRouter();
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
  const [updating, setUpdating] = useState(false);

  if (tasks.length === 0) return null;

  // 날짜 범위 계산
  const startDates = tasks.map((t) => new Date(t.startDate).getTime());
  const endDates = tasks.map((t) => new Date(t.endDate).getTime());
  const minDate = new Date(Math.min(...startDates));
  const maxDate = new Date(Math.max(...endDates));
  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  function dayOffset(dateStr: string) {
    return Math.ceil((new Date(dateStr).getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  // 날짜 헤더 (주 단위)
  const weekHeaders: { label: string; startDay: number; width: number }[] = [];
  let day = 0;
  while (day < totalDays) {
    const date = new Date(minDate);
    date.setDate(date.getDate() + day);
    const daysInWeek = Math.min(7, totalDays - day);
    weekHeaders.push({
      label: `${date.getMonth() + 1}/${date.getDate()}주`,
      startDay: day,
      width: daysInWeek,
    });
    day += 7;
  }

  const dayWidth = Math.max(24, Math.floor(320 / Math.min(totalDays, 30)));

  async function handleStatusChange(task: TaskRow, newStatus: string) {
    setUpdating(true);
    await updateTaskStatus(task.id, newStatus as "planned" | "active" | "done" | "canceled");
    setUpdating(false);
    setSelectedTask(null);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{siteName}</h2>
          <p className="text-base text-gray-500">
            {minDate.toLocaleDateString("ko-KR")} ~ {maxDate.toLocaleDateString("ko-KR")} ({totalDays}일)
          </p>
        </div>
        <a
          href={`/api/pdf/schedule/${siteId}`}
          target="_blank"
          className="bg-gray-100 text-gray-700 rounded-xl px-4 py-2.5 text-base font-semibold active:bg-gray-200"
        >
          📄 PDF
        </a>
      </div>

      {/* 범례 */}
      <div className="flex gap-4 mb-4 text-sm">
        {Object.entries(KIND_COLOR).map(([kind, color]) => (
          <div key={kind} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${color}`} />
            <span className="text-gray-600">
              {kind === "work" ? "작업" : kind === "reserve" ? "예비" : "비상"}
            </span>
          </div>
        ))}
      </div>

      {/* 간트 차트 */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div style={{ minWidth: totalDays * dayWidth + 120 }}>
          {/* 주 헤더 */}
          <div className="flex mb-1" style={{ paddingLeft: 120 }}>
            {weekHeaders.map((wk) => (
              <div
                key={wk.startDay}
                className="text-xs text-gray-500 border-l border-gray-200 pl-1"
                style={{ width: wk.width * dayWidth }}
              >
                {wk.label}
              </div>
            ))}
          </div>

          {/* 작업 행 */}
          {tasks.map((task) => {
            const left = dayOffset(task.startDate);
            const width = dayOffset(task.endDate) - left + 1;
            const barColor = KIND_COLOR[task.kind] ?? "bg-blue-500";
            const isDone = task.status === "done";
            const isActive = task.status === "active";

            return (
              <div key={task.id} className="flex items-center mb-3">
                {/* 작업명 */}
                <div className="w-[120px] shrink-0 pr-2">
                  <p className="text-base font-semibold text-gray-800 truncate">{task.title}</p>
                  <p className="text-sm text-gray-500">{task.durationDays}일</p>
                </div>

                {/* 바 */}
                <div className="relative flex-1" style={{ height: 44 }}>
                  {/* 배경 그리드 */}
                  <div className="absolute inset-0 flex">
                    {Array.from({ length: totalDays }).map((_, i) => (
                      <div
                        key={i}
                        className={`border-r ${i % 7 === 6 ? "border-gray-300" : "border-gray-100"}`}
                        style={{ width: dayWidth }}
                      />
                    ))}
                  </div>

                  {/* 간트 바 */}
                  <button
                    onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                    className={`absolute top-1 h-9 rounded-lg text-white text-sm font-semibold flex items-center justify-center shadow-sm active:opacity-80 ${barColor} ${isDone ? "opacity-60" : ""} ${isActive ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}
                    style={{
                      left: left * dayWidth,
                      width: Math.max(width * dayWidth - 2, 24),
                    }}
                  >
                    {width > 2 ? STATUS_LABEL[task.status] ?? "" : ""}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 작업 상세/수정 패널 */}
      {selectedTask && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{selectedTask.title}</h3>
          <p className="text-base text-gray-500 mb-4">
            {selectedTask.startDate} ~ {selectedTask.endDate} ({selectedTask.durationDays}일)
          </p>

          <div>
            <p className="text-base font-medium text-gray-700 mb-2">작업 상태 변경</p>
            <div className="grid grid-cols-2 gap-2">
              {(["planned", "active", "done", "canceled"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(selectedTask, s)}
                  disabled={updating || selectedTask.status === s}
                  className={`py-3 rounded-xl text-base font-medium disabled:opacity-40 ${
                    selectedTask.status === s
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setSelectedTask(null)}
            className="mt-3 w-full bg-gray-100 text-gray-600 rounded-xl py-3 text-base font-medium"
          >
            닫기
          </button>
        </div>
      )}

      {/* 요약 카드 */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {(["planned", "active", "done"] as const).map((s) => {
          const count = tasks.filter((t) => t.status === s && t.kind === "work").length;
          return (
            <div key={s} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-3xl font-black text-gray-900">{count}</p>
              <p className="text-base text-gray-500">{STATUS_LABEL[s]} 공종</p>
            </div>
          );
        })}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <p className="text-3xl font-black text-gray-900">{totalDays}</p>
          <p className="text-base text-gray-500">총 공사 일수</p>
        </div>
      </div>
    </div>
  );
}
