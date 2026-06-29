import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { HelpButton } from "@/components/tutorial/HelpButton";

export const dynamic = "force-dynamic";

type WorkerInfo = { name: string; phone: string | null };
type AssignmentInfo = { workers: WorkerInfo | WorkerInfo[] | null } | null;
type SiteInfo = { name: string; address: string | null } | null;

type TodayTask = {
  id: string;
  title: string;
  site_id: string;
  start_date: string | null;
  end_date: string | null;
  sites: SiteInfo;
  assignments: AssignmentInfo;
};

type PaymentRow = {
  id: string;
  stage_label: string;
  amount: number;
  due_date: string | null;
  sites: { name: string; customers: { name: string; phone: string | null } | { name: string; phone: string | null }[] | null } | { name: string; customers: { name: string; phone: string | null } | { name: string; phone: string | null }[] | null }[] | null;
};

type RecentSite = {
  id: string;
  name: string;
  address: string | null;
  status: string;
};

function first<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function formatKoreanDate(d: Date): string {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function mapHref(address: string | null | undefined, name: string): string {
  const q = encodeURIComponent(address?.trim() || name);
  return `https://map.kakao.com/?q=${q}`;
}

export default async function HomePage() {
  const supabase = await createClient();
  await supabase.auth.getUser();

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // 1. 오늘 진행 현장
  let todayTasks: TodayTask[] = [];
  try {
    const { data } = await supabase
      .from("schedule_tasks")
      .select(
        "id, title, site_id, start_date, end_date, sites(name, address), assignments(workers(name, phone))"
      )
      .lte("start_date", today)
      .gte("end_date", today)
      .neq("status", "canceled")
      .order("start_date", { ascending: true })
      .limit(20);
    todayTasks = (data as unknown as TodayTask[]) ?? [];
  } catch {
    todayTasks = [];
  }

  // 2. 긴급 미수금 — payment_schedules는 Database 타입에 보강되어 typed 클라이언트로 조회
  let payments: PaymentRow[] = [];
  try {
    const { data, error } = await supabase
      .from("payment_schedules")
      .select(
        "id, stage_label, amount, due_date, sites(name, customers(name, phone))"
      )
      .is("paid_at", null)
      .lte("due_date", soon)
      .order("due_date", { ascending: true })
      .limit(10);
    if (!error) payments = (data as unknown as PaymentRow[]) ?? [];
  } catch {
    payments = [];
  }

  // 3. 최근 현장 (오늘 현장이 없을 때 fallback)
  let recentSites: RecentSite[] = [];
  if (todayTasks.length === 0) {
    try {
      const { data } = await supabase
        .from("sites")
        .select("id, name, address, status")
        .in("status", ["in_progress", "contracted"])
        .order("start_date", { ascending: true })
        .limit(3);
      recentSites = (data as unknown as RecentSite[]) ?? [];
    } catch {
      recentSites = [];
    }
  }

  // 설정 완성도 확인 (count only, head:true — 행 본문을 가져오지 않아 가벼움)
  // 단가표(trade_prices)와 고객·견적이 준비됐는지로 신규 여부를 판단한다.
  let hasPriceBook = false;
  try {
    const { count } = await supabase
      .from("trade_prices")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);
    hasPriceBook = (count ?? 0) > 0;
  } catch {
    hasPriceBook = false;
  }

  let hasCustomer = false;
  try {
    const { count } = await supabase
      .from("customers")
      .select("id", { count: "exact", head: true });
    hasCustomer = (count ?? 0) > 0;
  } catch {
    hasCustomer = false;
  }

  let hasQuote = false;
  try {
    const { count } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true });
    hasQuote = (count ?? 0) > 0;
  } catch {
    hasQuote = false;
  }

  // 신규(가이드 노출) 판단: 데이터 0건 기준이 아니라 '설정 완성도' 기준.
  // 단가표·견적 중 하나라도 준비되지 않았으면, 현장을 막 만든 초보도 가이드를 계속 본다.
  const setupComplete = hasPriceBook && hasQuote;
  const isNewUser = !setupComplete;

  const onboardingSteps = [
    {
      href: "/settings/prices",
      step: "1단계",
      emoji: "💲",
      title: "단가표 설정",
      desc: "공정별 단가를 먼저 넣어야 견적을 만들 수 있어요",
      done: hasPriceBook,
    },
    {
      href: "/customers/new",
      step: "2단계",
      emoji: "🧑",
      title: "고객 등록",
      desc: "견적을 보낼 고객을 등록해 주세요",
      done: hasCustomer,
    },
    {
      href: "/quotes/new",
      step: "3단계",
      emoji: "📄",
      title: "첫 견적 만들기",
      desc: "단가표와 고객이 준비되면 견적을 작성해요",
      done: hasQuote,
    },
  ];

  const remainingSteps = onboardingSteps.filter((s) => !s.done).length;

  const quickActions = [
    { href: "/quotes/new", emoji: "📄", label: "새 견적", bg: "bg-blue-600", active: "active:bg-blue-700" },
    { href: "/messages", emoji: "✉️", label: "문자 보내기", bg: "bg-green-600", active: "active:bg-green-700" },
    { href: "/payments", emoji: "💰", label: "잔금 확인", bg: "bg-amber-600", active: "active:bg-amber-700" },
    { href: "/photos", emoji: "📷", label: "사진 올리기", bg: "bg-purple-600", active: "active:bg-purple-700" },
    { href: "/workers", emoji: "👷", label: "작업자 관리", bg: "bg-slate-600", active: "active:bg-slate-700" },
    { href: "/settings", emoji: "⚙️", label: "설정·단가표", bg: "bg-gray-600", active: "active:bg-gray-700" },
  ];

  return (
    <div className="px-4 pt-6 pb-24 space-y-6">
      {/* 날짜 헤더 */}
      <div>
        <h1 className="text-3xl font-black text-gray-900">오늘의 업무</h1>
        <p className="text-lg text-gray-500">{formatKoreanDate(now)}</p>
      </div>

      {/* 섹션 1: 오늘 진행 현장 */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-3">📍 오늘 진행 현장</h2>
        {todayTasks.length === 0 ? (
          recentSites.length > 0 ? (
            <div className="space-y-2">
              <p className="text-base text-gray-400 mb-1">최근 진행 현장</p>
              {recentSites.map((site) => (
                <Link
                  key={site.id}
                  href={`/sites/${site.id}?from=/`}
                  className="bg-white border border-gray-200 rounded-2xl px-5 py-4 flex items-center justify-between active:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="text-xl font-bold text-gray-900 truncate">{site.name}</p>
                    <p className="text-base text-gray-500 truncate">{site.address ?? ""}</p>
                  </div>
                  <a
                    href={mapHref(site.address, site.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 ml-3 bg-gray-100 text-gray-700 text-base font-semibold rounded-xl px-3 py-2"
                  >
                    지도 보기
                  </a>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-gray-100 rounded-2xl px-5 py-8 text-center text-gray-500 text-lg">
              오늘 예정된 현장이 없어요
            </div>
          )
        ) : (
          <div className="space-y-3">
            {todayTasks.map((task) => {
              const site = first(task.sites);
              const worker = first(first(task.assignments)?.workers);
              return (
                <Link
                  key={task.id}
                  href={`/schedule/${task.site_id}?from=/`}
                  className="block bg-white border border-gray-200 rounded-2xl px-5 py-4 active:bg-gray-50"
                >
                  <p className="text-2xl font-bold text-gray-900">{site?.name ?? "현장"}</p>
                  <p className="text-base text-gray-500 mb-3">{task.title}</p>
                  {worker && (
                    <a
                      href={worker.phone ? `tel:${worker.phone}` : undefined}
                      className="flex items-center gap-2 text-lg text-gray-700 mb-3"
                    >
                      <span className="text-2xl">👷</span>
                      <span className="font-semibold">{worker.name}</span>
                      {worker.phone && (
                        <span className="text-blue-600 font-semibold underline">
                          {worker.phone}
                        </span>
                      )}
                    </a>
                  )}
                  <a
                    href={mapHref(site?.address, site?.name ?? task.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-block bg-blue-50 text-blue-700 text-lg font-bold rounded-xl px-4 py-2.5"
                  >
                    🗺️ 지도 보기
                  </a>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* 섹션 2: 받을 돈 */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-3">💰 지금 받아야 할 돈</h2>
        {payments.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-6 text-center text-green-700 text-lg font-semibold">
            미수금이 없어요 👍
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => {
              const site = first(p.sites);
              const customer = first(site?.customers);
              const isOverdue = p.due_date ? p.due_date < today : false;
              return (
                <Link
                  key={p.id}
                  href="/payments"
                  className={`block bg-white rounded-2xl px-5 py-4 flex items-center justify-between active:bg-red-50 ${isOverdue ? "border-2 border-red-500" : "border border-red-200"}`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {isOverdue && <span className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded-full shrink-0">연체</span>}
                      <p className="text-xl font-bold text-gray-900 truncate">
                        {customer?.name ?? site?.name ?? "고객"}
                      </p>
                    </div>
                    <p className="text-base text-gray-500">
                      {p.stage_label}
                      {p.due_date ? ` · 약정일 ${p.due_date}` : ""}
                    </p>
                  </div>
                  <p className="text-2xl font-black text-red-600 shrink-0 ml-3">
                    {Number(p.amount).toLocaleString("ko-KR")}원
                  </p>
                </Link>
              );
            })}
          </div>
        )}
        <Link
          href="/payments"
          className="mt-3 block text-center bg-amber-100 text-amber-800 text-lg font-bold rounded-2xl py-4"
        >
          받을 돈 전체 보기
        </Link>
      </section>

      {/* 시작 가이드 — 단가표·견적 설정이 끝나지 않은 동안 계속 노출 */}
      {isNewUser && (
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-1">🚀 이렇게 시작하세요</h2>
          <p className="text-base text-gray-500 mb-3">
            {remainingSteps > 0
              ? `아래 순서대로 따라 하면 첫 견적까지 끝나요 (남은 단계 ${remainingSteps}개)`
              : "아래 순서대로 따라 하면 첫 견적까지 끝나요"}
          </p>
          <div className="space-y-3">
            {onboardingSteps.map((s) =>
              s.done ? (
                <div
                  key={s.href}
                  className="flex items-center gap-4 bg-green-50 border-2 border-green-200 rounded-2xl px-5 py-4"
                >
                  <span className="shrink-0 text-3xl">✅</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-green-700">{s.step} · 완료</p>
                    <p className="text-xl font-bold text-gray-500 line-through">{s.title}</p>
                  </div>
                </div>
              ) : (
                <Link
                  key={s.href}
                  href={s.href}
                  className="flex items-center gap-4 bg-white border-2 border-blue-200 rounded-2xl px-5 py-4 active:bg-blue-50"
                >
                  <span className="shrink-0 text-3xl">{s.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-blue-600">{s.step}</p>
                    <p className="text-xl font-bold text-gray-900">{s.title}</p>
                    <p className="text-base text-gray-500">{s.desc}</p>
                  </div>
                  <span className="shrink-0 text-2xl text-gray-300">›</span>
                </Link>
              )
            )}
          </div>
        </section>
      )}

      {/* 섹션 3: 빠른 실행 */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 mb-3">⚡ 바로 하기</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={`flex flex-col items-center gap-2 ${a.bg} ${a.active} text-white rounded-2xl py-6 shadow-sm`}
            >
              <span className="text-3xl">{a.emoji}</span>
              <span className="text-lg font-bold">{a.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <HelpButton tutorialKey="home" />
    </div>
  );
}
