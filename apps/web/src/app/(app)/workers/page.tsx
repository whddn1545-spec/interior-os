import Link from "next/link";
import { PlusIcon, PhoneIcon, ChevronRightIcon, BookOpenIcon, SettingsIcon, SearchIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function WorkersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: qParam } = await searchParams;
  // 검색어 정규화 (서버측 검증)
  const query = (qParam ?? "").trim().slice(0, 50);

  const supabase = await createClient();

  let workersQuery = supabase
    .from("workers")
    .select("id, name, phone, company, rating, is_active, worker_trades(trades(name_ko))")
    .eq("is_active", true)
    .order("name");

  if (query) {
    // ILIKE 와일드카드 문자 이스케이프
    const escaped = query.replace(/[%_\\]/g, "\\$&");
    workersQuery = workersQuery.or(
      `name.ilike.%${escaped}%,phone.ilike.%${escaped}%,company.ilike.%${escaped}%`
    );
  }

  const { data: workers } = await workersQuery;

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">작업자</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            aria-label="설정"
            className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 text-gray-600 active:bg-gray-200"
          >
            <SettingsIcon size={22} />
          </Link>
          <Link
            href="/workers/new"
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-3 rounded-xl text-base font-semibold"
          >
            <PlusIcon size={18} />
            추가
          </Link>
        </div>
      </div>

      {/* 출역 장부 바로가기 */}
      <Link
        href="/workers/attendance"
        className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-4 mb-4"
      >
        <BookOpenIcon size={24} className="text-orange-500 shrink-0" />
        <div className="flex-1">
          <p className="text-base font-bold text-orange-800">출역 장부 · 일당 정산</p>
          <p className="text-sm text-orange-600">이번달 출역 기록 및 인건비 정산</p>
        </div>
        <ChevronRightIcon size={20} className="text-orange-400" />
      </Link>

      {/* 이름·전화·업체 검색 */}
      <form action="/workers" method="get" className="mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon
              size={22}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="이름·전화·업체 검색"
              className="w-full rounded-xl border border-gray-300 bg-white py-4 pl-12 pr-4 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-5 py-4 text-base font-semibold text-white active:bg-blue-700"
          >
            검색
          </button>
        </div>
      </form>

      {query && (
        <Link
          href="/workers"
          className="mb-4 inline-block text-base font-medium text-blue-600"
        >
          검색 초기화 ✕
        </Link>
      )}

      {!workers || workers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-xl mb-2">
            {query ? "조건에 맞는 작업자가 없어요" : "등록된 작업자가 없어요"}
          </p>
          <p className="text-base mb-6">
            {query ? "검색어를 바꿔보세요" : "함께 일하는 작업자를 추가해보세요"}
          </p>
          {!query && (
            <Link
              href="/workers/new"
              className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-2xl px-8 py-4 text-lg font-bold active:bg-blue-700"
            >
              <PlusIcon size={20} />
              작업자 추가하기
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {workers.map((w) => {
            const wAny = w as unknown as Record<string, unknown>;
            const wts = (wAny.worker_trades as { trades: { name_ko: string } | null }[] | null) ?? [];
            const tradeNames = wts.map((wt) => wt.trades?.name_ko ?? "").filter(Boolean).join(", ");
            const rating = wAny.rating as number | null;
            return (
              <li key={wAny.id as string}>
                <Link
                  href={`/workers/${wAny.id as string}`}
                  className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl font-bold text-gray-600 shrink-0">
                    {(wAny.name as string).charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold text-gray-900">{wAny.name as string}</p>
                      {rating !== null && (
                        <span className="text-sm text-amber-500">{"★".repeat(Math.round(rating))}</span>
                      )}
                    </div>
                    <p className="text-base text-gray-500 truncate">{tradeNames || "다능"}</p>
                    {(wAny.company as string | null) && (
                      <p className="text-sm text-gray-400">{wAny.company as string}</p>
                    )}
                  </div>
                  <a
                    href={`tel:${wAny.phone as string}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-2 rounded-xl text-sm font-medium shrink-0"
                  >
                    <PhoneIcon size={16} />
                    전화
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
