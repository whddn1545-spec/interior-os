import Link from "next/link";
import { PlusIcon, FileTextIcon, CalendarIcon, MessageSquareIcon, AlertCircleIcon, ChevronRightIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // 진행 중인 현장
  const { data: activeSites } = await supabase
    .from("sites")
    .select("id, name, address, status, start_date, end_date")
    .in("status", ["contracted", "in_progress"])
    .order("start_date", { ascending: true })
    .limit(5);

  // 확인 대기 견적 (draft 상태)
  const { data: draftQuotes } = await supabase
    .from("quotes")
    .select("id, version, total_amount, created_at, sites(name)")
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(5);

  // 오늘 일정 있는 현장
  const today = new Date().toISOString().split("T")[0];
  const { data: todayTasks } = await supabase
    .from("schedule_tasks")
    .select("id, title, site_id, sites(name), trades(name_ko)")
    .eq("status", "active")
    .lte("start_date", today)
    .gte("end_date", today)
    .limit(10);

  const displayName = user?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? "사장님";

  const statusLabel: Record<string, string> = {
    contracted: "계약완료",
    in_progress: "공사중",
    lead: "상담중",
    quoting: "견적중",
    done: "완료",
  };

  return (
    <div className="px-4 pt-8 pb-24">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">{displayName} 안녕하세요 👋</h1>
      <p className="text-lg text-gray-500 mb-8">오늘도 수고하세요</p>

      {/* 빠른 액션 */}
      <section className="mb-8 grid grid-cols-2 gap-3">
        <Link
          href="/quotes/new"
          className="flex flex-col items-center gap-2 bg-blue-600 text-white rounded-2xl px-4 py-5 shadow-sm active:bg-blue-700"
        >
          <PlusIcon size={28} />
          <span className="text-lg font-semibold">새 견적</span>
        </Link>
        <Link
          href="/messages"
          className="flex flex-col items-center gap-2 bg-green-600 text-white rounded-2xl px-4 py-5 shadow-sm active:bg-green-700"
        >
          <MessageSquareIcon size={28} />
          <span className="text-lg font-semibold">문자 보내기</span>
        </Link>
      </section>

      {/* 확인 대기 견적 */}
      {draftQuotes && draftQuotes.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircleIcon size={20} className="text-orange-500" />
            <h2 className="text-xl font-semibold text-gray-800">확인 대기 견적</h2>
            <span className="bg-orange-500 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {draftQuotes.length}
            </span>
          </div>
          <div className="space-y-2">
            {draftQuotes.map((q) => {
              const site = q.sites as unknown as { name: string } | null;
              return (
                <Link
                  key={q.id}
                  href={`/quotes/${q.id}`}
                  className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-2xl px-4 py-4"
                >
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{site?.name ?? "현장 미정"}</p>
                    <p className="text-base text-gray-500">v{q.version} · {q.total_amount.toLocaleString("ko-KR")}원</p>
                  </div>
                  <div className="flex items-center gap-1 text-orange-600 font-medium">
                    <span>확인하기</span>
                    <ChevronRightIcon size={18} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 오늘 일정 */}
      {todayTasks && todayTasks.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">오늘 진행 중인 작업</h2>
          <div className="space-y-2">
            {todayTasks.map((task) => {
              const site = task.sites as unknown as { name: string } | null;
              const trade = task.trades as unknown as { name_ko: string } | null;
              return (
                <Link
                  key={task.id}
                  href={`/schedule/${task.site_id}`}
                  className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-4"
                >
                  <CalendarIcon size={22} className="text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-semibold text-gray-900 truncate">{task.title}</p>
                    <p className="text-base text-gray-500">{site?.name} · {trade?.name_ko ?? ""}</p>
                  </div>
                  <ChevronRightIcon size={18} className="text-gray-400" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 진행 중인 현장 */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-gray-800">진행 중인 현장</h2>
          <Link href="/customers" className="text-base text-blue-600">전체 보기</Link>
        </div>
        {!activeSites || activeSites.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center text-gray-400 border border-gray-100">
            <CalendarIcon size={40} className="mx-auto mb-2 opacity-30" />
            <p className="text-lg">진행 중인 현장이 없어요</p>
            <Link href="/quotes/new" className="mt-3 inline-block text-blue-600 font-medium">
              새 견적 만들기 →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {activeSites.map((site) => (
              <Link
                key={site.id}
                href={`/schedule/${site.id}`}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl px-4 py-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-semibold text-gray-900 truncate">{site.name}</p>
                  <p className="text-base text-gray-500 truncate">{site.address}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                    site.status === "in_progress" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {statusLabel[site.status] ?? site.status}
                  </span>
                  <ChevronRightIcon size={18} className="text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 빠른 메뉴 그리드 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-3">바로가기</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { href: "/quotes", label: "견적 목록", emoji: "📄" },
            { href: "/customers", label: "고객 관리", emoji: "👥" },
            { href: "/workers", label: "작업자", emoji: "🔧" },
            { href: "/finance", label: "매출 관리", emoji: "💰" },
            { href: "/photos", label: "사진 관리", emoji: "📷" },
            { href: "/instagram", label: "인스타", emoji: "📸" },
            { href: "/materials", label: "자재산출", emoji: "🧮" },
            { href: "/moodboard", label: "무드보드", emoji: "🎨" },
            { href: "/settings/prices", label: "단가표", emoji: "⚙️" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-2 bg-white border border-gray-200 rounded-2xl py-4 px-2"
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-sm font-medium text-gray-700 text-center">{item.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
