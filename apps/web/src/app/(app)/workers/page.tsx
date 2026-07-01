import Link from "next/link";
import { PlusIcon, PhoneIcon, ChevronRightIcon, BookOpenIcon, SettingsIcon, SearchIcon, ArrowLeftIcon } from "lucide-react";
import { Fab } from "@/components/fab";
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
      {/* 홈으로 돌아가기 (더보기 메뉴로 진입 시 길 잃지 않도록) */}
      <Link
        href="/"
        className="mb-3 -ml-2 inline-flex h-14 items-center gap-2 rounded-xl px-2 text-base font-semibold text-muted-foreground active:bg-muted"
      >
        <ArrowLeftIcon size={24} />
        홈으로
      </Link>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[28px] font-black tracking-tight text-foreground">작업자</h1>
        <Link
          href="/settings"
          aria-label="설정"
          className="flex items-center justify-center w-12 h-12 rounded-xl bg-muted text-muted-foreground active:bg-accent"
        >
          <SettingsIcon size={22} />
        </Link>
      </div>
      <Fab href="/workers/new" label="새 작업자" />

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
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none"
            />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="이름·전화·업체 검색"
              className="w-full rounded-xl border border-border bg-card py-4 pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-primary px-5 py-4 text-base font-semibold text-white active:bg-primary/90"
          >
            검색
          </button>
        </div>
      </form>

      {query && (
        <Link
          href="/workers"
          className="mb-4 inline-block text-base font-medium text-primary"
        >
          검색 초기화 ✕
        </Link>
      )}

      {!workers || workers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground/70">
          <p className="text-xl mb-2">
            {query ? "조건에 맞는 작업자가 없어요" : "등록된 작업자가 없어요"}
          </p>
          <p className="text-base mb-6">
            {query ? "검색어를 바꿔보세요" : "함께 일하는 작업자를 추가해보세요"}
          </p>
          {!query && (
            <Link
              href="/workers/new"
              className="inline-flex items-center gap-2 bg-primary text-white rounded-2xl px-8 py-4 text-lg font-bold active:bg-primary/90"
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
                  className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-4 active:bg-muted">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-xl font-bold text-muted-foreground shrink-0">
                    {(wAny.name as string).charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold text-foreground">{wAny.name as string}</p>
                      {rating !== null && (
                        <span className="text-sm text-amber-500">{"★".repeat(Math.round(rating))}</span>
                      )}
                    </div>
                    <p className="text-base text-muted-foreground truncate">{tradeNames || "다능"}</p>
                    {(wAny.company as string | null) && (
                      <p className="text-sm text-muted-foreground/70">{wAny.company as string}</p>
                    )}
                  </div>
                  <a
                    href={`tel:${wAny.phone as string}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 bg-green-100 text-profit px-3 py-2.5 rounded-xl text-base font-semibold shrink-0"
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
