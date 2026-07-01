import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PlusIcon, ChevronRightIcon, SearchIcon } from "lucide-react";
import { Fab } from "@/components/fab";
import { formatKRW } from "@interior-os/core/pricing";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = [
  { key: "all",         label: "전체" },
  { key: "lead",        label: "상담중" },
  { key: "quoting",     label: "견적중" },
  { key: "contracted",  label: "계약" },
  { key: "in_progress", label: "공사중" },
  { key: "done",        label: "완료" },
] as const;

type StatusKey = (typeof STATUS_FILTERS)[number]["key"];

const STATUS_DOT: Record<string, string> = {
  lead:        "bg-muted-foreground",
  quoting:     "bg-info",
  contracted:  "bg-warning",
  in_progress: "bg-profit",
  done:        "bg-primary/50",
  canceled:    "bg-loss",
};
const STATUS_LABEL: Record<string, string> = {
  lead: "상담중", quoting: "견적중", contracted: "계약",
  in_progress: "공사중", done: "완료", canceled: "취소",
};

function formatDateShort(s: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status: statusParam, q: qParam } = await searchParams;
  const activeStatus = (STATUS_FILTERS.some((f) => f.key === statusParam) ? statusParam : "all") as StatusKey;
  const query = (qParam ?? "").trim().slice(0, 50);

  const supabase = await createClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  // 현장 목록 + 이번달 KPI 병렬 조회
  let sitesQuery = supabase
    .from("sites")
    .select("id, name, address, status, start_date, end_date, customer_id, customers(name), quotes(total_amount)")
    .order("start_date", { ascending: false, nullsFirst: false })
    .limit(100);

  if (activeStatus !== "all") sitesQuery = sitesQuery.eq("status", activeStatus);
  if (query) {
    const escaped = query.replace(/[%_\\]/g, "\\$&");
    sitesQuery = sitesQuery.ilike("name", `%${escaped}%`);
  }

  const [
    { data: sites },
    { count: activeCount },
    { count: doneMonthCount },
    { data: monthIncome },
  ] = await Promise.all([
    sitesQuery,
    supabase
      .from("sites")
      .select("id", { count: "exact", head: true })
      .in("status", ["contracted", "in_progress"]),
    supabase
      .from("sites")
      .select("id", { count: "exact", head: true })
      .eq("status", "done")
      .gte("end_date", startOfMonth),
    supabase
      .from("finance_entries")
      .select("amount")
      .eq("direction", "in")
      .gte("paid_at", startOfMonth),
  ]);

  const siteList = (sites as unknown as {
    id: string; name: string; address: string | null;
    status: string; start_date: string | null; end_date: string | null;
    customer_id: string | null;
    customers: { name: string } | null;
    quotes: { total_amount: number }[];
  }[]) ?? [];

  const monthTotalIncome = (monthIncome ?? []).reduce((s, e) => s + Number((e as { amount: number }).amount), 0);

  // 상태별 카운트
  const statusCount: Record<string, number> = {};
  for (const s of siteList) {
    statusCount[s.status] = (statusCount[s.status] ?? 0) + 1;
  }

  return (
    <div className="pb-24">
      {/* 상단 KPI */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-[28px] font-black tracking-tight text-foreground mb-4">현장</h1>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card rounded-2xl border border-border p-3 text-center">
            <p className="text-2xl font-black text-profit">{activeCount ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">진행중</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-3 text-center">
            <p className="text-2xl font-black text-foreground">{doneMonthCount ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">이번달 완공</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-3 text-center">
            <p className="text-lg font-black text-primary tabular-nums">
              {monthTotalIncome > 0
                ? monthTotalIncome >= 10000000
                  ? `${Math.round(monthTotalIncome / 10000000 * 10) / 10}천만`
                  : monthTotalIncome >= 1000000
                    ? `${Math.round(monthTotalIncome / 100000) / 10}백만`
                    : formatKRW(monthTotalIncome)
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">이번달 입금</p>
          </div>
        </div>
      </div>

      <Fab href="/quotes/new" label="새 현장 시작" />

      {/* 검색 */}
      <div className="px-4 mb-3">
        <form action="/sites" method="get">
          {activeStatus !== "all" && <input type="hidden" name="status" value={activeStatus} />}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="현장 이름 검색"
                className="w-full h-12 rounded-xl border border-border bg-card pl-11 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button type="submit" className="h-12 px-5 rounded-xl bg-primary text-primary-foreground text-base font-semibold active:bg-primary/90">
              검색
            </button>
          </div>
        </form>
        {query && (
          <Link href={activeStatus === "all" ? "/sites" : `/sites?status=${activeStatus}`}
            className="mt-2 inline-block text-base font-medium text-primary">
            검색 초기화 ✕
          </Link>
        )}
      </div>

      {/* 상태 필터 */}
      <div className="px-4 mb-4 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {STATUS_FILTERS.map((f) => {
            const isActive = f.key === activeStatus;
            const params = new URLSearchParams();
            if (query) params.set("q", query);
            if (f.key !== "all") params.set("status", f.key);
            const qs = params.toString();
            const count = f.key === "all"
              ? siteList.length
              : f.key === "in_progress" ? (activeCount ?? 0) : (statusCount[f.key] ?? 0);
            return (
              <Link
                key={f.key}
                href={qs ? `/sites?${qs}` : "/sites"}
                className={`flex h-11 items-center gap-1.5 px-4 rounded-xl text-base font-bold whitespace-nowrap transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground active:bg-muted"
                }`}
              >
                {f.key !== "all" && (
                  <span className={`w-2 h-2 rounded-full ${STATUS_DOT[f.key] ?? "bg-muted-foreground"}`} />
                )}
                {f.label}
                {count > 0 && (
                  <span className={`text-xs px-1.5 rounded-full ${isActive ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"}`}>
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* 목록 */}
      <div className="px-4 space-y-2">
        {siteList.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-10 text-center">
            <p className="text-lg text-muted-foreground mb-2">
              {query ? "검색 결과가 없어요" : activeStatus !== "all" ? "해당 상태의 현장이 없어요" : "아직 현장이 없어요"}
            </p>
            {!query && activeStatus === "all" && (
              <Link
                href="/quotes/new"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-2xl px-7 py-4 text-base font-bold active:bg-primary/90"
              >
                <PlusIcon size={18} />
                새 현장 시작하기
              </Link>
            )}
          </div>
        ) : (
          siteList.map((site) => {
            const totalAmount = (site.quotes ?? []).reduce((s, q) => s + Number(q.total_amount), 0);
            const isActive = ["contracted", "in_progress"].includes(site.status);
            return (
              <Link
                key={site.id}
                href={`/sites/${site.id}`}
                className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-4 active:bg-muted"
              >
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[site.status] ?? "bg-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-base font-bold text-foreground truncate">{site.name}</p>
                    {isActive && (
                      <span className="text-xs bg-profit/12 text-profit font-semibold px-1.5 py-0.5 rounded-md shrink-0">진행중</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {site.customers?.name ?? ""}
                    {site.customers?.name && (site.start_date || totalAmount > 0) ? " · " : ""}
                    {site.start_date ? `${formatDateShort(site.start_date)} ~ ${formatDateShort(site.end_date)}` : ""}
                    {totalAmount > 0 ? (site.start_date ? ` · ${formatKRW(totalAmount)}` : formatKRW(totalAmount)) : ""}
                  </p>
                </div>
                <ChevronRightIcon size={18} className="text-muted-foreground/40 shrink-0" />
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
