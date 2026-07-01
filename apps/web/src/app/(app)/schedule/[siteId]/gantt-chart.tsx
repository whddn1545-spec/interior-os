"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateTaskStatus, updateTaskDates } from "./actions";
import { AlertCircleIcon } from "lucide-react";

interface TaskRow {
  id: string;
  title: string;
  tradeNameKo: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  kind: "work" | "reserve" | "contingency";
  status: string;
  dependsOn?: string[];
  tradeId?: string;
}

interface Props {
  tasks: TaskRow[];
  siteId: string;
  siteName: string;
}

const KIND_COLOR: Record<string, string> = {
  work: "bg-primary/100",
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

  const [localTasks, setLocalTasks] = useState(tasks);
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const [dragging, setDragging] = useState<{ id: string; startLeft: number; startX: number } | null>(null);

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

  function checkViolation(task: TaskRow) {
    if (!task.dependsOn || task.dependsOn.length === 0) return false;
    for (const depId of task.dependsOn) {
      const parent = localTasks.find((t) => t.tradeId === depId);
      if (parent) {
        if (new Date(task.startDate).getTime() <= new Date(parent.endDate).getTime()) {
          return true;
        }
      }
    }
    return false;
  }

  const handlePointerDown = (e: React.PointerEvent, task: TaskRow) => {
    if (e.button !== 0 || task.status === "done" || task.status === "canceled") return;
    setDragging({
      id: task.id,
      startLeft: dayOffset(task.startDate),
      startX: e.clientX,
    });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const deltaX = e.clientX - dragging.startX;
    const offsetDays = Math.round(deltaX / dayWidth);
    
    setLocalTasks((prev) =>
      prev.map((t) => {
        if (t.id === dragging.id) {
          const newLeft = dragging.startLeft + offsetDays;
          
          const newStart = new Date(minDate);
          newStart.setDate(newStart.getDate() + newLeft);
          
          const newEnd = new Date(newStart);
          newEnd.setDate(newEnd.getDate() + t.durationDays - 1);

          return {
            ...t,
            startDate: newStart.toISOString().split("T")[0],
            endDate: newEnd.toISOString().split("T")[0],
          };
        }
        return t;
      })
    );
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    if (!dragging) return;
    const deltaX = e.clientX - dragging.startX;
    const task = localTasks.find((t) => t.id === dragging.id);
    setDragging(null);
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (Math.abs(deltaX) < 5) {
      // Treat as click
      setSelectedTask(selectedTask?.id === task?.id ? null : (task ?? null));
      return;
    }

    if (task) {
      const original = tasks.find((t) => t.id === task.id);
      if (original && (original.startDate !== task.startDate || original.endDate !== task.endDate)) {
        setUpdating(true);
        await updateTaskDates(task.id, task.startDate, task.endDate);
        setUpdating(false);
        router.refresh();
      }
    }
  };

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
          <h2 className="text-xl font-bold text-foreground">{siteName}</h2>
          <p className="text-base text-muted-foreground">
            {minDate.toLocaleDateString("ko-KR")} ~ {maxDate.toLocaleDateString("ko-KR")} ({totalDays}일)
          </p>
        </div>
        <a
          href={`/api/pdf/schedule/${siteId}`}
          target="_blank"
          className="bg-muted text-foreground/90 rounded-xl px-4 py-2.5 text-base font-semibold active:bg-muted"
        >
          📄 PDF
        </a>
      </div>

      {/* 범례 */}
      <div className="flex gap-4 mb-4 text-sm">
        {Object.entries(KIND_COLOR).map(([kind, color]) => (
          <div key={kind} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${color}`} />
            <span className="text-muted-foreground">
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
                className="text-xs text-muted-foreground border-l border-border pl-1"
                style={{ width: wk.width * dayWidth }}
              >
                {wk.label}
              </div>
            ))}
          </div>

          {/* 작업 행 */}
          {localTasks.map((task) => {
            const left = dayOffset(task.startDate);
            const width = dayOffset(task.endDate) - left + 1;
            const barColor = KIND_COLOR[task.kind] ?? "bg-primary/100";
            const isDone = task.status === "done";
            const isActive = task.status === "active";
            const hasViolation = checkViolation(task);

            return (
              <div key={task.id} className="flex items-center mb-3">
                {/* 작업명 */}
                <div className="w-[120px] shrink-0 pr-2 flex items-center justify-between">
                  <div className="truncate">
                    <p className="text-base font-semibold text-foreground truncate">{task.title}</p>
                    <p className="text-sm text-muted-foreground">{task.durationDays}일</p>
                  </div>
                  {hasViolation && (
                    <AlertCircleIcon size={16} className="text-red-500 shrink-0 ml-1" />
                  )}
                </div>

                {/* 바 */}
                <div className="relative flex-1" style={{ height: 44 }}>
                  {/* 배경 그리드 */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {Array.from({ length: totalDays }).map((_, i) => (
                      <div
                        key={i}
                        className={`border-r ${i % 7 === 6 ? "border-border" : "border-border"}`}
                        style={{ width: dayWidth }}
                      />
                    ))}
                  </div>

                  {/* 간트 바 */}
                  <div
                    onPointerDown={(e) => handlePointerDown(e, task)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className={`absolute top-1 h-9 rounded-lg text-white text-sm font-semibold flex items-center justify-center shadow-sm ${
                      isDone || task.status === "canceled" ? "cursor-default opacity-60" : "cursor-ew-resize active:opacity-80"
                    } ${barColor} ${isActive ? "ring-2 ring-offset-1 ring-blue-400" : ""} ${
                      hasViolation ? "ring-2 ring-offset-1 ring-red-500" : ""
                    }`}
                    style={{
                      left: left * dayWidth,
                      width: Math.max(width * dayWidth - 2, 24),
                      touchAction: "none",
                    }}
                  >
                    {width > 2 ? STATUS_LABEL[task.status] ?? "" : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 작업 상세/수정 패널 */}
      {selectedTask && (
        <div className="mt-6 bg-card rounded-2xl border border-border p-4">
          <h3 className="text-lg font-bold text-foreground mb-1">{selectedTask.title}</h3>
          <p className="text-base text-muted-foreground mb-4">
            {selectedTask.startDate} ~ {selectedTask.endDate} ({selectedTask.durationDays}일)
          </p>

          <div>
            <p className="text-base font-medium text-foreground/90 mb-2">작업 상태 변경</p>
            <div className="grid grid-cols-2 gap-2">
              {(["planned", "active", "done", "canceled"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(selectedTask, s)}
                  disabled={updating || selectedTask.status === s}
                  className={`py-3 rounded-xl text-base font-medium disabled:opacity-40 ${
                    selectedTask.status === s
                      ? "bg-primary text-white"
                      : "bg-muted text-foreground/90"
                  }`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setSelectedTask(null)}
            className="mt-3 w-full bg-muted text-muted-foreground rounded-xl py-3 text-base font-medium"
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
            <div key={s} className="bg-card rounded-2xl border border-border p-4 text-center">
              <p className="text-3xl font-black text-foreground">{count}</p>
              <p className="text-base text-muted-foreground">{STATUS_LABEL[s]} 공종</p>
            </div>
          );
        })}
        <div className="bg-card rounded-2xl border border-border p-4 text-center">
          <p className="text-3xl font-black text-foreground">{totalDays}</p>
          <p className="text-base text-muted-foreground">총 공사 일수</p>
        </div>
      </div>
    </div>
  );
}
