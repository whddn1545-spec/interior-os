import Link from "next/link";
import { ArrowLeftIcon, ShieldAlertIcon, CheckCircleIcon } from "lucide-react";
import { getPaymentBoard, getQuotesMissingSchedule } from "./actions";
import { PaymentCard } from "./payment-card";
import { MissingScheduleBanner } from "./missing-schedule-banner";
import { HelpButton } from "@/components/tutorial/HelpButton";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "overdue", label: "연체 🔴" },
  { key: "soon", label: "이번 주" },
  { key: "ok", label: "여유" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const activeFilter = (FILTERS.some((f) => f.key === filter) ? filter : "all") as FilterKey;

  const [result, missingResult] = await Promise.all([
    getPaymentBoard(),
    getQuotesMissingSchedule(),
  ]);
  const items = result.ok ? result.data : [];
  const error = result.ok ? null : result.error;
  const missingQuotes = missingResult.ok ? missingResult.data : [];

  const filtered =
    activeFilter === "all" ? items : items.filter((i) => i.urgency === activeFilter);

  const totalOutstanding = items.reduce((sum, i) => sum + i.amount, 0);
  const overdueCount = items.filter((i) => i.urgency === "overdue").length;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-24">
      <Link
        href="/"
        className="mb-3 -ml-2 inline-flex h-14 items-center gap-2 rounded-xl px-2 text-base font-semibold text-muted-foreground active:bg-muted"
      >
        <ArrowLeftIcon size={24} />
        홈으로
      </Link>
      {/* 상단 헤더 */}
      <header className="mb-6">
        <h1 className="text-2xl font-black text-foreground">💰 받을 돈</h1>
        <p className="mt-2 text-sm text-muted-foreground">총 미수금</p>
        <p className="text-4xl font-black text-primary/90">
          {totalOutstanding.toLocaleString("ko-KR")}원
        </p>
        {overdueCount > 0 && (
          <p className="mt-1 text-base font-bold text-loss">
            ⚠️ 연체 {overdueCount}건
          </p>
        )}
      </header>

      {/* 필터 탭 */}
      <nav className="mb-6 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => {
          const isActive = f.key === activeFilter;
          return (
            <a
              key={f.key}
              href={f.key === "all" ? "/payments" : `/payments?filter=${f.key}`}
              className={`flex h-14 min-w-[80px] flex-1 items-center justify-center rounded-xl px-4 text-base font-bold transition-colors ${
                isActive
                  ? "bg-primary/90 text-white"
                  : "bg-muted text-foreground/90 active:bg-muted"
              }`}
            >
              {f.label}
            </a>
          );
        })}
      </nav>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-4 text-base text-loss">
          데이터를 불러오지 못했습니다: {error}
        </div>
      )}

      {/* 잔금 일정 누락 복구 — 확정 견적은 있는데 스케줄이 없을 때 */}
      <MissingScheduleBanner quotes={missingQuotes} />

      {/* 카드 리스트 */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card px-4 py-16 text-center">
          <p className="text-lg font-bold text-muted-foreground/70">받을 돈이 없습니다 🎉</p>
          <p className="mt-3 text-base text-muted-foreground">
            확정된 견적이 있는데 안 보이나요?
          </p>
          <Link
            href="/quotes"
            className="mt-4 inline-flex min-h-[56px] items-center justify-center rounded-xl bg-primary/90 px-6 py-4 text-base font-bold text-white active:bg-blue-800"
          >
            견적 보기 →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((item) => (
            <PaymentCard key={item.id} schedule={item} />
          ))}
        </div>
      )}

      <HelpButton tutorialKey="payments" />
    </div>
  );
}
