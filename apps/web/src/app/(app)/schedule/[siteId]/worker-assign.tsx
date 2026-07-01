"use client";

import { useState, useTransition } from "react";
import { UserPlusIcon, XIcon, CheckIcon, MessageSquareIcon } from "lucide-react";
import { assignWorker } from "./actions";
import { useRouter } from "next/navigation";

interface Worker {
  id: string;
  name: string;
  phone: string;
  tradeCodes: string[];
}

interface Task {
  id: string;
  title: string;
  tradeId: string | null;
  tradeCode: string | null;
  startDate: string;
  endDate: string;
}

interface Assignment {
  workerId: string;
  workerName: string;
  workerPhone: string;
  status: string;
}

interface Props {
  siteId: string;
  tasks: Task[];
  workers: Worker[];
  assignments: Assignment[];
}

const STATUS_LABEL: Record<string, string> = { proposed: "제안", confirmed: "확정", declined: "거절", done: "완료" };

export function WorkerAssign({ siteId, tasks, workers, assignments }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAssign() {
    if (!selectedTask || !selectedWorker) return;
    startTransition(async () => {
      setError(null);
      const result = await assignWorker(
        siteId,
        selectedTask.id,
        selectedWorker,
        selectedTask.tradeId,
        selectedTask.startDate,
        selectedTask.endDate
      );
      if (result.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error ?? "배정 실패");
      }
    });
  }

  const filteredWorkers = selectedTask?.tradeCode
    ? workers.filter((w) => w.tradeCodes.length === 0 || w.tradeCodes.includes(selectedTask.tradeCode!))
    : workers;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2.5 rounded-xl text-base font-semibold active:bg-green-700"
      >
        <UserPlusIcon size={18} />
        작업자 배정
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">작업자 배정</h2>
              <button onClick={() => setOpen(false)} className="p-3 text-gray-400 active:bg-gray-100 rounded-xl">
                <XIcon size={24} />
              </button>
            </div>

            {/* 현재 배정 현황 */}
            {assignments.length > 0 && (
              <div className="mb-5">
                <h3 className="text-base font-semibold text-gray-700 mb-2">현재 배정</h3>
                <div className="space-y-2">
                  {assignments.map((a, i) => (
                    <div key={i} className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-base font-semibold text-gray-900">{a.workerName}</p>
                          <p className="text-sm text-green-700 font-medium">{STATUS_LABEL[a.status] ?? a.status}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {a.workerPhone && (
                            <a
                              href={`tel:${a.workerPhone}`}
                              className="flex items-center gap-1 bg-white border border-green-300 text-green-700 px-3 py-2.5 rounded-xl text-base font-semibold active:bg-green-50"
                            >
                              📞 전화
                            </a>
                          )}
                          <a
                            href={`/messages?workerId=${a.workerId}`}
                            className="flex items-center gap-1 bg-green-600 text-white px-3 py-2.5 rounded-xl text-base font-semibold active:bg-green-700"
                          >
                            <MessageSquareIcon size={15} />
                            문자
                          </a>
                        </div>
                      </div>
                      {a.workerPhone && (
                        <p className="text-sm text-gray-500 mt-1">{a.workerPhone}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 공종/작업 선택 */}
            <div className="mb-4">
              <label className="block text-base font-semibold text-gray-700 mb-2">배정할 작업</label>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => { setSelectedTask(task); setSelectedWorker(""); }}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                      selectedTask?.id === task.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <p className="text-base font-semibold text-gray-900">{task.title}</p>
                    <p className="text-sm text-gray-500">{task.startDate} ~ {task.endDate}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 작업자 선택 */}
            {selectedTask && (
              <div className="mb-5">
                <label className="block text-base font-semibold text-gray-700 mb-2">
                  작업자 선택
                  {filteredWorkers.length < workers.length && (
                    <span className="text-sm font-normal text-gray-500 ml-2">({selectedTask.title} 공종 필터)</span>
                  )}
                </label>
                {filteredWorkers.length === 0 ? (
                  <p className="text-base text-gray-400">등록된 작업자가 없어요. 작업자 탭에서 추가해주세요.</p>
                ) : (
                  <div className="space-y-2">
                    {filteredWorkers.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => setSelectedWorker(w.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 ${
                          selectedWorker === w.id ? "border-green-500 bg-green-50" : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="text-left">
                          <p className="text-base font-semibold text-gray-900">{w.name}</p>
                          <p className="text-sm text-gray-500">{w.phone}</p>
                        </div>
                        {selectedWorker === w.id && <CheckIcon size={20} className="text-green-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-base mb-4">
                {error}
              </div>
            )}

            <button
              onClick={handleAssign}
              disabled={isPending || !selectedTask || !selectedWorker}
              className="w-full py-4 bg-green-600 text-white rounded-xl text-lg font-bold disabled:opacity-50"
            >
              {isPending ? "배정 중..." : "배정 완료"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
