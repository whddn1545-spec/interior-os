import Link from "next/link";
import { CalendarIcon, ChevronRightIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABEL: Record<string, string> = {
  lead: "상담중", quoting: "견적중", contracted: "계약완료",
  in_progress: "공사중", done: "완료", canceled: "취소",
};

const STATUS_COLOR: Record<string, string> = {
  lead: "text-gray-500", quoting: "text-yellow-600", contracted: "text-blue-600",
  in_progress: "text-green-600", done: "text-gray-400", canceled: "text-red-400",
};

export default async function SchedulePage() {
  const supabase = await createClient();

  // 일정 있는 현장 목록 (진행 중 또는 계약 완료)
  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, address, status, start_date, end_date, schedule_tasks(id, status)")
    .in("status", ["contracted", "in_progress", "done"])
    .order("start_date", { ascending: false })
    .limit(30);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">공사 일정</h1>
      </div>

      {/* 오늘 기준 안내 */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-2">
        <CalendarIcon size={18} className="text-blue-600 shrink-0" />
        <p className="text-sm text-blue-700">오늘: {new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}</p>
      </div>

      {!sites || sites.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CalendarIcon size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-xl">진행 중인 현장이 없어요</p>
          <p className="text-sm mt-1">계약 완료 후 일정을 생성할 수 있어요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sites.map((site) => {
            const sAny = site as unknown as Record<string, unknown>;
            const tasks = (sAny.schedule_tasks as { id: string; status: string }[] | null) ?? [];
            const doneTasks = tasks.filter((t) => t.status === "done").length;
            const totalTasks = tasks.length;
            const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
            const status = sAny.status as string;
            const startDate = sAny.start_date as string | null;
            const endDate = sAny.end_date as string | null;

            const isActive = startDate && endDate
              ? today >= startDate && today <= endDate
              : false;

            return (
              <Link
                key={sAny.id as string}
                href={`/schedule/${sAny.id as string}`}
                className={`block bg-white border rounded-2xl px-4 py-4 ${
                  isActive ? "border-green-300 shadow-sm" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center gap-2 mb-1">
                      {isActive && (
                        <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
                      )}
                      <p className="text-lg font-semibold text-gray-900 truncate">{sAny.name as string}</p>
                    </div>
                    <p className={`text-sm font-medium ${STATUS_COLOR[status] ?? "text-gray-500"}`}>
                      {STATUS_LABEL[status] ?? status}
                    </p>
                  </div>
                  <ChevronRightIcon size={18} className="text-gray-300 shrink-0 mt-1" />
                </div>

                {/* 날짜 */}
                {(startDate ?? endDate) && (
                  <p className="text-sm text-gray-500 mb-3">
                    {startDate ? new Date(startDate).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : "?"}
                    {" ~ "}
                    {endDate ? new Date(endDate).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : "?"}
                  </p>
                )}

                {/* 진행률 */}
                {totalTasks > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-500">진행률</span>
                      <span className="font-medium text-gray-700">{doneTasks}/{totalTasks} ({progress}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {totalTasks === 0 && (
                  <p className="text-sm text-amber-600 font-medium">일정 미생성 — 견적 확정 후 일정 생성</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
