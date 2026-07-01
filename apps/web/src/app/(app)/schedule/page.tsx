import Link from "next/link";
import { CalendarIcon, ChevronRightIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABEL: Record<string, string> = {
  lead: "상담중", quoting: "견적중", contracted: "계약완료",
  in_progress: "공사중", done: "완료", canceled: "취소",
};

const STATUS_COLOR: Record<string, string> = {
  lead: "text-gray-500", quoting: "text-yellow-600", contracted: "text-primary",
  in_progress: "text-profit", done: "text-gray-400", canceled: "text-red-400",
};

export default async function SchedulePage() {
  const supabase = await createClient();

  // 일정 있는 현장 목록 (진행 중 / 계약 완료 / 견적 확정된 현장)
  // 1) 계약 이후 단계의 현장은 status 기준으로 노출
  const { data: contractedSites } = await supabase
    .from("sites")
    .select("id, name, address, status, start_date, end_date, schedule_tasks(id, status)")
    .in("status", ["contracted", "in_progress", "done"])
    .order("start_date", { ascending: false })
    .limit(30);

  // 2) 아직 'quoting' 상태지만 확정된 견적이 있는 현장도 노출
  //    (견적 확정 → 계약 전이라도 일정을 만들 수 있도록)
  const { data: quotingSites } = await supabase
    .from("sites")
    .select("id, name, address, status, start_date, end_date, schedule_tasks(id, status), quotes!inner(id, status)")
    .eq("status", "quoting")
    .in("quotes.status", ["confirmed", "sent", "accepted"])
    .order("start_date", { ascending: false })
    .limit(30);

  // 두 결과를 합치고 현장 id 기준으로 중복 제거
  const sitesById = new Map<string, Record<string, unknown>>();
  for (const s of [...(contractedSites ?? []), ...(quotingSites ?? [])]) {
    const sAny = s as unknown as Record<string, unknown>;
    sitesById.set(sAny.id as string, sAny);
  }
  const sites = Array.from(sitesById.values());

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">공사 일정</h1>
      </div>

      {/* 오늘 기준 안내 */}
      <div className="bg-primary/10 border border-blue-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-2">
        <CalendarIcon size={18} className="text-primary shrink-0" />
        <p className="text-sm text-primary/90">오늘: {new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}</p>
      </div>

      {sites.length === 0 ? (
        <div className="text-center py-16">
          <CalendarIcon size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-xl text-gray-500">진행 중인 현장이 없어요</p>
          <p className="text-base text-gray-400 mt-1 mb-6">견적을 확정하면 여기에서 일정을 만들 수 있어요</p>
          <Link
            href="/quotes"
            className="inline-flex items-center justify-center gap-2 bg-primary text-white rounded-2xl px-8 py-4 text-lg font-bold"
          >
            견적 확정된 현장 보기
            <ChevronRightIcon size={20} className="shrink-0" />
          </Link>
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
                className={`block bg-white border rounded-2xl px-4 py-4 active:bg-gray-50 ${
                  isActive ? "border-green-300 shadow-sm" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center gap-2 mb-1">
                      {isActive && (
                        <span className="w-2 h-2 bg-profit/100 rounded-full shrink-0" />
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
                        className="h-full bg-primary/100 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {totalTasks === 0 && (
                  <div className="flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-4 px-4 text-base font-bold">
                    눌러서 공사 일정 만들기
                    <ChevronRightIcon size={20} className="shrink-0" />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
