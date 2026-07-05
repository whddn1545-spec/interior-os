import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { calcMonthlyReport } from "@interior-os/core/report";

export const dynamic = "force-dynamic";

// 월간 사장님 리포트 — 이번 달 장사가 어땠는지 1장 요약.
// 모든 숫자는 DB 집계 + core 순수 함수(calcMonthlyReport)로 계산. LLM 미사용.

function kstToday(): Date {
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()));
}

/** "2026-07" → 해당 월 [시작일, 다음달 시작일) */
function monthRange(monthKey: string): { start: string; end: string } {
  const [y, m] = monthKey.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start: start.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
}

function addMonths(monthKey: string, diff: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + diff, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatWon(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 100000000) {
    const eok = abs / 100000000;
    return `${sign}${Number.isInteger(eok) ? eok : eok.toFixed(1)}억원`;
  }
  if (abs >= 10000) return `${sign}${Math.round(abs / 10000).toLocaleString("ko-KR")}만원`;
  return `${sign}${abs.toLocaleString("ko-KR")}원`;
}

async function sumFinance(
  supabase: Awaited<ReturnType<typeof createClient>>,
  direction: "in" | "out",
  start: string,
  end: string
): Promise<number> {
  const { data } = await supabase
    .from("finance_entries")
    .select("amount")
    .eq("direction", direction)
    .gte("paid_at", start)
    .lt("paid_at", end);
  return ((data ?? []) as { amount: number }[]).reduce((s, e) => s + Number(e.amount), 0);
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const supabase = await createClient();

  const today = kstToday();
  const currentMonthKey = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
  const monthKey = /^\d{4}-\d{2}$/.test(month ?? "") ? month! : currentMonthKey;
  const { start, end } = monthRange(monthKey);
  const prev = monthRange(addMonths(monthKey, -1));
  const todayStr = today.toISOString().split("T")[0];

  const [
    income,
    expense,
    lastMonthIncome,
    { data: duePayments },
    { data: overduePayments },
    { data: monthQuotes },
    { count: sitesCompleted },
  ] = await Promise.all([
    sumFinance(supabase, "in", start, end),
    sumFinance(supabase, "out", start, end),
    sumFinance(supabase, "in", prev.start, prev.end),
    supabase
      .from("payment_schedules")
      .select("amount, paid_at, paid_amount")
      .gte("due_date", start)
      .lt("due_date", end),
    supabase
      .from("payment_schedules")
      .select("amount")
      .is("paid_at", null)
      .lt("due_date", todayStr),
    supabase
      .from("quotes")
      .select("status")
      .gte("created_at", `${start}T00:00:00Z`)
      .lt("created_at", `${end}T00:00:00Z`),
    supabase
      .from("sites")
      .select("id", { count: "exact", head: true })
      .eq("status", "done")
      .gte("updated_at", `${start}T00:00:00Z`)
      .lt("updated_at", `${end}T00:00:00Z`),
  ]);

  const dueRows = (duePayments ?? []) as { amount: number; paid_at: string | null; paid_amount: number | null }[];
  const paymentsDueTotal = dueRows.reduce((s, r) => s + Number(r.amount), 0);
  const paymentsPaidTotal = dueRows
    .filter((r) => r.paid_at)
    .reduce((s, r) => s + Number(r.paid_amount ?? r.amount), 0);
  const overdueAmount = ((overduePayments ?? []) as { amount: number }[]).reduce(
    (s, r) => s + Number(r.amount),
    0
  );

  const quoteRows = (monthQuotes ?? []) as { status: string }[];
  const quotesCreated = quoteRows.length;
  const quotesSent = quoteRows.filter((q) =>
    ["sent", "accepted", "rejected"].includes(q.status)
  ).length;
  const quotesAccepted = quoteRows.filter((q) => q.status === "accepted").length;

  const report = calcMonthlyReport({
    income,
    expense,
    lastMonthIncome,
    paymentsDueTotal,
    paymentsPaidTotal,
    overdueAmount,
    quotesCreated,
    quotesSent,
    quotesAccepted,
    sitesCompleted: sitesCompleted ?? 0,
  });

  const [year, monthNum] = monthKey.split("-").map(Number);
  const isCurrentMonth = monthKey === currentMonthKey;

  return (
    <div className="px-4 pt-6 pb-24 max-w-2xl mx-auto">
      {/* 월 이동 */}
      <div className="flex items-center justify-between mb-1">
        <Link
          href={`/report?month=${addMonths(monthKey, -1)}`}
          className="p-3 -ml-3 text-muted-foreground active:bg-muted rounded-xl"
          aria-label="지난달 리포트"
        >
          <ChevronLeftIcon size={24} />
        </Link>
        <h1 className="text-2xl font-black text-foreground">
          {year}년 {monthNum}월 리포트
        </h1>
        {isCurrentMonth ? (
          <span className="p-3 -mr-3 w-12" />
        ) : (
          <Link
            href={`/report?month=${addMonths(monthKey, 1)}`}
            className="p-3 -mr-3 text-muted-foreground active:bg-muted rounded-xl"
            aria-label="다음달 리포트"
          >
            <ChevronRightIcon size={24} />
          </Link>
        )}
      </div>
      <p className="text-base text-muted-foreground text-center mb-6">
        {isCurrentMonth ? "이번 달 장사, 지금까지 이렇게 하고 있어요" : "이 달 장사는 이랬어요"}
      </p>

      {/* 1. 돈 — 입금/지출/순이익 */}
      <section className="bg-card border border-border rounded-2xl p-5 mb-4">
        <h2 className="text-lg font-bold text-foreground mb-4">💰 돈</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground">들어온 돈</p>
            <p className="text-2xl font-black text-profit tabular-nums">{formatWon(report.income)}</p>
            {report.momGrowthPct !== null && (
              <p className={`text-sm font-bold mt-0.5 ${report.momGrowthPct >= 0 ? "text-profit" : "text-loss"}`}>
                지난달보다 {report.momGrowthPct >= 0 ? "↑" : "↓"}{Math.abs(report.momGrowthPct)}%
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">나간 돈</p>
            <p className="text-2xl font-black text-loss tabular-nums">{formatWon(report.expense)}</p>
          </div>
        </div>
        <div className="border-t border-border pt-3 flex items-center justify-between">
          <p className="text-base font-bold text-foreground">남은 돈 (순이익)</p>
          <p className={`text-2xl font-black tabular-nums ${report.netProfit >= 0 ? "text-profit" : "text-loss"}`}>
            {formatWon(report.netProfit)}
          </p>
        </div>
      </section>

      {/* 2. 수금 */}
      <section className="bg-card border border-border rounded-2xl p-5 mb-4">
        <h2 className="text-lg font-bold text-foreground mb-4">🧾 수금</h2>
        {report.collectionRatePct !== null ? (
          <>
            <div className="flex items-end justify-between mb-2">
              <p className="text-base text-muted-foreground">이 달 받기로 한 돈 중</p>
              <p className="text-3xl font-black text-primary tabular-nums">{report.collectionRatePct}%</p>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden mb-2">
              <div
                className={`h-full rounded-full ${report.collectionRatePct >= 80 ? "bg-profit" : report.collectionRatePct >= 50 ? "bg-warning" : "bg-loss"}`}
                style={{ width: `${Math.min(100, report.collectionRatePct)}%` }}
              />
            </div>
            <p className="text-base text-muted-foreground">
              {formatWon(report.paymentsDueTotal)} 중 {formatWon(report.paymentsPaidTotal)} 받았어요
            </p>
          </>
        ) : (
          <p className="text-base text-muted-foreground">이 달 약정된 수금 일정이 없어요</p>
        )}
        {report.overdueAmount > 0 && (
          <Link
            href="/payments"
            className="mt-3 flex items-center justify-between rounded-xl bg-loss/10 border border-loss/30 px-4 py-3 active:bg-loss/15"
          >
            <span className="text-base font-bold text-loss">⚠️ 연체 중인 미수금</span>
            <span className="text-lg font-black text-loss tabular-nums">{formatWon(report.overdueAmount)} →</span>
          </Link>
        )}
      </section>

      {/* 3. 견적 */}
      <section className="bg-card border border-border rounded-2xl p-5 mb-4">
        <h2 className="text-lg font-bold text-foreground mb-4">📄 견적</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted rounded-xl py-3">
            <p className="text-2xl font-black text-foreground tabular-nums">{report.quotesCreated}</p>
            <p className="text-sm text-muted-foreground">만든 견적</p>
          </div>
          <div className="bg-muted rounded-xl py-3">
            <p className="text-2xl font-black text-foreground tabular-nums">{report.quotesSent}</p>
            <p className="text-sm text-muted-foreground">보낸 견적</p>
          </div>
          <div className="bg-muted rounded-xl py-3">
            <p className="text-2xl font-black text-profit tabular-nums">{report.quotesAccepted}</p>
            <p className="text-sm text-muted-foreground">계약 성사</p>
          </div>
        </div>
        {report.conversionRatePct !== null && (
          <p className="text-base text-muted-foreground mt-3 text-center">
            보낸 견적 10건 중 <span className="font-bold text-foreground">{Math.round(report.conversionRatePct / 10)}건</span>이 계약으로 이어졌어요 ({report.conversionRatePct}%)
          </p>
        )}
      </section>

      {/* 4. 현장 */}
      <section className="bg-card border border-border rounded-2xl p-5 mb-4">
        <h2 className="text-lg font-bold text-foreground mb-3">🏗️ 현장</h2>
        <p className="text-base text-foreground">
          이 달 완료한 현장 <span className="text-2xl font-black text-primary tabular-nums">{report.sitesCompleted}</span>곳
        </p>
      </section>

      <p className="text-sm text-muted-foreground/70 text-center mt-6">
        모든 숫자는 입력하신 장부·견적·수금 기록으로만 계산돼요
      </p>
    </div>
  );
}
