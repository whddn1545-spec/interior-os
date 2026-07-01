import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TrendingUpIcon, TrendingDownIcon, ArrowLeftIcon } from "lucide-react";
import { FinanceForm } from "./finance-form";
import { FinanceEntryItem } from "./finance-entry-item";
import { RevenueChart } from "./revenue-chart";

const CATEGORY_LABEL: Record<string, string> = {
  customer_payment: "고객 입금",
  material: "자재비",
  labor: "인건비",
  outsourcing: "외주비",
  etc: "기타",
};

export default async function FinancePage() {
  const supabase = await createClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  // 6개월 시작일 계산
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split("T")[0];

  const [{ data: entries }, { data: sites }, { data: chartEntries }] = await Promise.all([
    supabase
      .from("finance_entries")
      .select("id, direction, amount, category, paid_at, memo, counterparty, sites(name)")
      .gte("paid_at", startOfMonth)
      .lte("paid_at", endOfMonth)
      .order("paid_at", { ascending: false }),
    supabase
      .from("sites")
      .select("id, name")
      .in("status", ["contracted", "in_progress", "done", "quoting"])
      .order("name"),
    // 6개월 차트용
    supabase
      .from("finance_entries")
      .select("direction, amount, paid_at")
      .gte("paid_at", sixMonthsAgo),
  ]);

  const totalIn = (entries ?? [])
    .filter((e) => (e as { direction: string }).direction === "in")
    .reduce((s, e) => s + ((e as { amount: number }).amount ?? 0), 0);

  const totalOut = (entries ?? [])
    .filter((e) => (e as { direction: string }).direction === "out")
    .reduce((s, e) => s + ((e as { amount: number }).amount ?? 0), 0);

  // 이번 달 지출을 항목(category)별로 집계 — 데이터는 이미 entries에 들어와 있어 그룹핑만 한다
  const OUT_CATEGORIES = ["material", "labor", "outsourcing", "etc"] as const;
  const outByCategory = (entries ?? [])
    .filter((e) => (e as { direction: string }).direction === "out")
    .reduce<Record<string, number>>((acc, e) => {
      const cat = (e as { category: string }).category ?? "etc";
      const key = (OUT_CATEGORIES as readonly string[]).includes(cat) ? cat : "etc";
      acc[key] = (acc[key] ?? 0) + ((e as { amount: number }).amount ?? 0);
      return acc;
    }, {});
  const maxOutCategory = Math.max(1, ...OUT_CATEGORIES.map((c) => outByCategory[c] ?? 0));

  const siteList = (sites ?? []).map((s) => ({
    id: (s as { id: string }).id,
    name: (s as { name: string }).name,
  }));

  // 6개월 차트 데이터 집계
  const KO_MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
  const chartMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      label: KO_MONTHS[d.getMonth()],
      shortLabel: String(d.getMonth() + 1),
      income: 0,
      expense: 0,
      isCurrentMonth: d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(),
    };
  });

  for (const e of chartEntries ?? []) {
    const row = e as { direction: string; amount: number; paid_at: string };
    const d = new Date(row.paid_at);
    const slot = chartMonths.find(
      (m) => m.year === d.getFullYear() && m.month === d.getMonth()
    );
    if (!slot) continue;
    if (row.direction === "in") slot.income += Number(row.amount);
    else slot.expense += Number(row.amount);
  }

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
        <h1 className="text-2xl font-bold text-foreground">매출 관리</h1>
        <FinanceForm sites={siteList} />
      </div>

      {/* 6개월 트렌드 차트 */}
      <div className="mb-5">
        <RevenueChart months={chartMonths} />
      </div>

      {/* 이번 달 요약 */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-card border border-border rounded-2xl p-3.5">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUpIcon size={14} className="text-profit" />
            <p className="text-xs text-muted-foreground">수입</p>
          </div>
          <p className="text-base font-black text-profit tabular-nums leading-tight">
            {totalIn >= 10_000_000
              ? `${(totalIn / 10_000_000).toFixed(1)}천만`
              : totalIn >= 1_000_000
                ? `${Math.round(totalIn / 10_000)}만`
                : `${totalIn.toLocaleString()}원`}
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3.5">
          <div className="flex items-center gap-1 mb-1">
            <TrendingDownIcon size={14} className="text-loss" />
            <p className="text-xs text-muted-foreground">지출</p>
          </div>
          <p className="text-base font-black text-loss tabular-nums leading-tight">
            {totalOut >= 10_000_000
              ? `${(totalOut / 10_000_000).toFixed(1)}천만`
              : totalOut >= 1_000_000
                ? `${Math.round(totalOut / 10_000)}만`
                : `${totalOut.toLocaleString()}원`}
          </p>
        </div>
        <div className={`rounded-2xl p-3.5 border ${totalIn - totalOut >= 0 ? "bg-primary/8 border-primary/20" : "bg-loss/8 border-loss/20"}`}>
          <p className="text-xs text-muted-foreground mb-1">순이익</p>
          <p className={`text-base font-black tabular-nums leading-tight ${totalIn - totalOut >= 0 ? "text-primary" : "text-loss"}`}>
            {totalIn - totalOut >= 0 ? "+" : ""}
            {Math.abs(totalIn - totalOut) >= 10_000_000
              ? `${((totalIn - totalOut) / 10_000_000).toFixed(1)}천만`
              : Math.abs(totalIn - totalOut) >= 1_000_000
                ? `${Math.round(Math.abs(totalIn - totalOut) / 10_000)}만`
                : `${(totalIn - totalOut).toLocaleString()}원`}
          </p>
        </div>
      </div>

      {/* 이번 달 지출 항목별 — 어디에 얼마 썼는지 한눈에 */}
      {totalOut > 0 && (
        <div className="bg-card border border-border rounded-2xl px-4 py-4 mb-6">
          <p className="text-base font-semibold text-foreground/90 mb-3">이번 달 지출 항목별</p>
          <div className="space-y-3">
            {OUT_CATEGORIES.map((c) => {
              const value = outByCategory[c] ?? 0;
              const ratio = Math.round((value / maxOutCategory) * 100);
              return (
                <div key={c}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-base text-foreground/90">{CATEGORY_LABEL[c]}</span>
                    <span className="text-base font-bold text-foreground">
                      {value.toLocaleString("ko-KR")}원
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-400"
                      style={{ width: `${value > 0 ? Math.max(ratio, 4) : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 이번 달 내역 */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold text-foreground">{now.getMonth() + 1}월 내역</h2>
        <span className="text-base text-muted-foreground">{(entries ?? []).length}건</span>
      </div>

      {!entries || entries.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground/70 bg-card rounded-2xl border border-border">
          <p className="text-lg">이번 달 내역이 없어요</p>
          <p className="text-base mt-1">위의 &quot;입출금 추가&quot; 버튼을 눌러 기록하세요</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(entries as unknown as Record<string, unknown>[]).map((e) => (
            <FinanceEntryItem
              key={e.id as string}
              id={e.id as string}
              direction={e.direction as "in" | "out"}
              category={e.category as string}
              amount={e.amount as number}
              paidAt={e.paid_at as string}
              siteName={(e.sites as { name: string } | null)?.name ?? null}
              memo={(e.memo as string | null) ?? null}
              categoryLabel={CATEGORY_LABEL[e.category as string] ?? e.category as string}
            />
          ))}
        </div>
      )}
    </div>
  );
}
