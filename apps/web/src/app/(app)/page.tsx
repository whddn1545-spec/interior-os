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

  // 3. 이번달 KPI
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
  let monthIncome = 0;
  let lastMonthIncome = 0;
  let activeCount = 0;
  try {
    const [incomeRes, lastMonthRes, activeSitesRes] = await Promise.all([
      supabase
        .from("finance_entries")
        .select("amount")
        .eq("direction", "in")
        .gte("paid_at", startOfMonth),
      supabase
        .from("finance_entries")
        .select("amount")
        .eq("direction", "in")
        .gte("paid_at", startOfLastMonth)
        .lte("paid_at", endOfLastMonth),
      supabase
        .from("sites")
        .select("id", { count: "exact", head: true })
        .in("status", ["contracted", "in_progress"]),
    ]);
    monthIncome = (incomeRes.data ?? []).reduce((s, e) => s + Number((e as { amount: number }).amount), 0);
    lastMonthIncome = (lastMonthRes.data ?? []).reduce((s, e) => s + Number((e as { amount: number }).amount), 0);
    activeCount = activeSitesRes.count ?? 0;
  } catch {
    monthIncome = 0;
    lastMonthIncome = 0;
    activeCount = 0;
  }

  // 전월 대비 성장률
  const momGrowth = lastMonthIncome > 0
    ? Math.round(((monthIncome - lastMonthIncome) / lastMonthIncome) * 100)
    : null;

  // 4. 고객이 수락한 미확인 견적 (최근 7일 이내 accepted 상태)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  type AcceptedQuote = { id: string; total_amount: number; sites: { name: string; id: string } | null };
  let acceptedQuotes: AcceptedQuote[] = [];
  try {
    const { data } = await supabase
      .from("quotes")
      .select("id, total_amount, sites(id, name)")
      .eq("status", "accepted")
      .gte("updated_at", sevenDaysAgo)
      .order("updated_at", { ascending: false })
      .limit(5);
    acceptedQuotes = (data as unknown as AcceptedQuote[]) ?? [];
  } catch {
    acceptedQuotes = [];
  }

  // 5. 미처리 A/S 건수
  let openAsCount = 0;
  try {
    const { count } = await supabase
      .from("as_requests")
      .select("id", { count: "exact", head: true })
      .neq("status", "closed");
    openAsCount = count ?? 0;
  } catch {
    openAsCount = 0;
  }

  // 4. 최근 현장 (오늘 현장이 없을 때 fallback)
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
    { href: "/quotes/new", emoji: "📄", label: "새 견적" },
    { href: "/messages", emoji: "✉️", label: "문자 보내기" },
    { href: "/payments", emoji: "💰", label: "잔금 확인" },
    { href: "/photos", emoji: "📷", label: "사진 올리기" },
    { href: "/workers", emoji: "👷", label: "작업자 관리" },
    { href: "/settings", emoji: "⚙️", label: "설정·단가표" },
  ];

  return (
    <div className="px-4 pt-6 pb-24 space-y-6">
      {/* 날짜 + 이번달 KPI */}
      <div>
        <h1 className="text-[28px] font-black tracking-tight text-foreground">오늘의 업무</h1>
        <p className="text-base text-muted-foreground mt-0.5 mb-4">{formatKoreanDate(now)}</p>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/sites?status=in_progress"
            className="bg-card border border-border rounded-2xl p-4 active:bg-muted"
          >
            <p className="text-3xl font-black text-profit tabular-nums">{activeCount}</p>
            <p className="text-sm text-muted-foreground mt-0.5">진행중 현장</p>
          </Link>
          <Link
            href="/finance"
            className="bg-card border border-border rounded-2xl p-4 active:bg-muted"
          >
            <div className="flex items-start justify-between gap-1">
              <p className="text-xl font-black text-primary tabular-nums truncate">
                {monthIncome > 0
                  ? monthIncome >= 100000000
                    ? `${(monthIncome / 100000000).toFixed(1)}억`
                    : monthIncome >= 10000000
                      ? `${Math.round(monthIncome / 1000000)}백만`
                      : `${Math.round(monthIncome / 10000)}만`
                  : "—"}
              </p>
              {momGrowth !== null && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0 mt-0.5 ${
                  momGrowth > 0
                    ? "bg-profit/15 text-profit"
                    : momGrowth < 0
                      ? "bg-loss/15 text-loss"
                      : "bg-muted text-muted-foreground"
                }`}>
                  {momGrowth > 0 ? "↑" : momGrowth < 0 ? "↓" : "→"}{Math.abs(momGrowth)}%
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">이번달 입금</p>
          </Link>
        </div>
      </div>

      {/* 섹션 1: 오늘 진행 현장 */}
      <section>
        <h2 className="text-xl font-bold text-foreground mb-3">📍 오늘 진행 현장</h2>
        {todayTasks.length === 0 ? (
          recentSites.length > 0 ? (
            <div className="space-y-2">
              <p className="text-base text-muted-foreground mb-1">최근 진행 현장</p>
              {recentSites.map((site) => (
                <Link
                  key={site.id}
                  href={`/sites/${site.id}?from=/`}
                  className="bg-card border border-border rounded-2xl px-5 py-4 flex items-center justify-between active:bg-muted transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xl font-bold text-foreground truncate">{site.name}</p>
                    <p className="text-base text-muted-foreground truncate">{site.address ?? ""}</p>
                  </div>
                  <a
                    href={mapHref(site.address, site.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 ml-3 inline-flex items-center min-h-12 px-4 bg-info/12 text-info rounded-xl text-base font-semibold active:bg-info/20"
                  >
                    지도 보기
                  </a>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-surface rounded-2xl px-5 py-8 text-center text-muted-foreground text-lg">
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
                  className="relative block overflow-hidden bg-card border border-border rounded-2xl pl-5 pr-4 py-4 shadow-sm active:bg-muted active:scale-[0.98] transition-all duration-200"
                >
                  <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
                  <p className="text-2xl font-bold text-foreground">{site?.name ?? "현장"}</p>
                  <p className="text-base text-muted-foreground mb-3">{task.title}</p>
                  {worker && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">👷</span>
                      <span className="text-[17px] font-semibold text-foreground">{worker.name}</span>
                      {worker.phone && (
                        <a
                          href={`tel:${worker.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="ml-auto inline-flex items-center gap-1.5 min-h-12 px-4 bg-profit/12 text-profit rounded-xl text-[17px] font-bold active:bg-profit/20"
                        >
                          📞 전화
                        </a>
                      )}
                    </div>
                  )}
                  <a
                    href={mapHref(site?.address, site?.name ?? task.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center min-h-12 px-4 bg-info/12 text-info rounded-xl text-[17px] font-bold active:bg-info/20"
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
        <h2 className="text-xl font-bold text-foreground mb-3">💰 지금 받아야 할 돈</h2>
        {payments.length === 0 ? (
          <div className="bg-profit/10 border border-profit/20 rounded-2xl px-5 py-6 text-center text-profit text-lg font-semibold">
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
                  className={`block bg-card rounded-2xl px-5 py-4 flex items-center justify-between active:bg-muted active:scale-[0.98] transition-all duration-200 ${isOverdue ? "border-2 border-loss" : "border border-loss/30"}`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {isOverdue && <span className="text-xs font-bold text-loss-foreground bg-loss px-2 py-0.5 rounded-full shrink-0">연체</span>}
                      <p className="text-xl font-bold text-foreground truncate">
                        {customer?.name ?? site?.name ?? "고객"}
                      </p>
                    </div>
                    <p className="text-base text-muted-foreground">
                      {p.stage_label}
                      {p.due_date ? ` · 약정일 ${p.due_date}` : ""}
                    </p>
                  </div>
                  <p className="text-2xl font-black text-loss tabular-nums shrink-0 ml-3">
                    {Number(p.amount).toLocaleString("ko-KR")}원
                  </p>
                </Link>
              );
            })}
          </div>
        )}
        <Link
          href="/payments"
          className="mt-3 block text-center bg-warning/15 text-warning-foreground text-lg font-bold rounded-2xl py-4 active:bg-warning/25"
        >
          받을 돈 전체 보기
        </Link>
      </section>

      {/* 고객 수락 알림 */}
      {acceptedQuotes.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">🎉 고객이 수락한 견적</h2>
          <div className="space-y-2">
            {acceptedQuotes.map((q) => {
              const site = first(q.sites);
              return (
                <Link
                  key={q.id}
                  href={`/quotes/${q.id}?from=/`}
                  className="flex items-center gap-3 bg-profit/10 border border-profit/30 rounded-2xl px-5 py-4 active:opacity-80"
                >
                  <span className="text-2xl shrink-0">✅</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-foreground truncate">
                      {site?.name ?? "현장"}
                    </p>
                    <p className="text-sm text-profit font-semibold">고객이 견적을 수락했어요!</p>
                  </div>
                  <p className="text-base font-black text-foreground tabular-nums shrink-0">
                    {Number(q.total_amount).toLocaleString("ko-KR")}원
                  </p>
                </Link>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            계약서를 만들거나 공사 일정을 잡아보세요
          </p>
        </section>
      )}

      {/* A/S 처리 알림 */}
      {openAsCount > 0 && (
        <section>
          <Link
            href="/sites"
            className="flex items-center gap-3 bg-warning/10 border border-warning/30 rounded-2xl px-5 py-4 active:opacity-80"
          >
            <span className="text-2xl">🔧</span>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-foreground">미처리 A/S {openAsCount}건</p>
              <p className="text-sm text-muted-foreground">완공 현장 A/S 요청을 처리해주세요</p>
            </div>
            <span className="bg-warning text-warning-foreground text-sm font-bold px-2.5 py-1 rounded-full shrink-0">
              {openAsCount}
            </span>
          </Link>
        </section>
      )}

      {/* 시작 가이드 */}
      {isNewUser && (
        <section>
          <h2 className="text-xl font-bold text-foreground mb-1">🚀 이렇게 시작하세요</h2>
          <p className="text-base text-muted-foreground mb-3">
            {remainingSteps > 0
              ? `아래 순서대로 따라 하면 첫 견적까지 끝나요 (남은 단계 ${remainingSteps}개)`
              : "아래 순서대로 따라 하면 첫 견적까지 끝나요"}
          </p>
          <div className="space-y-3">
            {onboardingSteps.map((s) =>
              s.done ? (
                <div
                  key={s.href}
                  className="flex items-center gap-4 bg-profit/10 border-2 border-profit/20 rounded-2xl px-5 py-4"
                >
                  <span className="shrink-0 text-3xl">✅</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-profit">{s.step} · 완료</p>
                    <p className="text-xl font-bold text-muted-foreground line-through">{s.title}</p>
                  </div>
                </div>
              ) : (
                <Link
                  key={s.href}
                  href={s.href}
                  className="flex items-center gap-4 bg-card border-2 border-primary/30 rounded-2xl px-5 py-4 active:bg-accent active:scale-[0.98] transition-all duration-200"
                >
                  <span className="shrink-0 text-3xl">{s.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-primary">{s.step}</p>
                    <p className="text-xl font-bold text-foreground">{s.title}</p>
                    <p className="text-base text-muted-foreground">{s.desc}</p>
                  </div>
                  <span className="shrink-0 text-2xl text-muted-foreground">›</span>
                </Link>
              )
            )}
          </div>
        </section>
      )}

      {/* 섹션 3: 빠른 실행 */}
      <section>
        <h2 className="text-xl font-bold text-foreground mb-3">⚡ 바로 하기</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex flex-col items-center gap-2 bg-card border border-border rounded-2xl py-6 active:bg-muted active:scale-[0.98] transition-all duration-200 shadow-sm"
            >
              <span className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-3xl">
                {a.emoji}
              </span>
              <span className="text-[17px] font-bold text-foreground">{a.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <HelpButton tutorialKey="home" />
    </div>
  );
}
