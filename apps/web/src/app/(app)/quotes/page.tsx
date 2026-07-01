import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { QuoteListActions } from "./quote-list-actions";
import { Fab } from "@/components/fab";

const STATUS_FILTERS = [
  { key: "all", label: "전체" },
  { key: "draft", label: "임시저장" },
  { key: "confirmed", label: "확정" },
  { key: "accepted", label: "계약됨" },
  { key: "rejected", label: "거절됨" },
] as const;

type StatusFilterKey = (typeof STATUS_FILTERS)[number]["key"];

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const activeStatus = (STATUS_FILTERS.some((f) => f.key === statusParam)
    ? statusParam
    : "all") as StatusFilterKey;

  const supabase = await createClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, version, status, total_amount, created_at, sites(name, customers(name))")
    .order("created_at", { ascending: false })
    .limit(50);

  const allQuotes = quotes ?? [];
  const monthQuotes = allQuotes.filter((q) => (q.created_at as string) >= startOfMonth);
  const monthConfirmed = monthQuotes.filter((q) => ["confirmed","sent","accepted"].includes(q.status as string));
  const monthTotal = monthConfirmed.reduce((s, q) => s + ((q.total_amount as number) ?? 0), 0);

  // 상태별 필터링 ("확정" 탭은 발송됨도 포함)
  const visibleQuotes =
    activeStatus === "all"
      ? allQuotes
      : activeStatus === "confirmed"
        ? allQuotes.filter((q) => ["confirmed", "sent"].includes(q.status as string))
        : allQuotes.filter((q) => (q.status as string) === activeStatus);

  const statusLabel: Record<string, string> = {
    draft: "임시저장",
    confirmed: "확정",
    sent: "발송됨",
    accepted: "계약됨",
    rejected: "거절됨",
  };

  const statusColor: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    confirmed: "bg-blue-100 text-primary/90",
    sent: "bg-green-100 text-profit",
    accepted: "bg-purple-100 text-purple-700",
    rejected: "bg-red-100 text-loss",
  };

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-[28px] font-black tracking-tight text-foreground mb-6">견적</h1>
      <Fab href="/quotes/new" label="새 견적" />

      {/* 이번달 요약 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-primary/10 border border-blue-100 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-primary/90">{monthConfirmed.length}건</p>
          <p className="text-sm text-muted-foreground">이번달 확정 견적</p>
        </div>
        <div className="bg-profit/10 border border-green-100 rounded-2xl p-4 text-center">
          <p className="text-lg font-black text-profit">{monthTotal.toLocaleString("ko-KR")}원</p>
          <p className="text-sm text-muted-foreground">이번달 견적 총액</p>
        </div>
      </div>

      {/* 상태 필터 탭 */}
      <nav className="mb-6 flex gap-2 overflow-x-auto">
        {STATUS_FILTERS.map((f) => {
          const isActive = f.key === activeStatus;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/quotes" : `/quotes?status=${f.key}`}
              className={`flex h-14 min-w-[88px] flex-1 items-center justify-center rounded-xl px-4 text-base font-bold transition-colors ${
                isActive
                  ? "bg-primary/90 text-white"
                  : "bg-muted text-foreground/90 active:bg-muted"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {allQuotes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground/70">
          <p className="text-xl mb-2">아직 견적이 없어요</p>
          <p className="text-base">위의 &quot;새 견적&quot; 버튼을 눌러 시작하세요</p>
        </div>
      ) : visibleQuotes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground/70">
          <p className="text-xl mb-2">해당 상태의 견적이 없어요</p>
          <p className="text-base">다른 탭을 눌러보세요</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visibleQuotes.map((q) => {
            const site = q.sites as unknown as { name: string; customers: { name: string } | null } | null;
            const customerName = site?.customers?.name ?? null;
            const isDraft = (q.status as string) === "draft";
            return (
              <li key={q.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                <Link
                  href={`/quotes/${q.id}?from=/quotes`}
                  className="block px-4 py-4 active:bg-muted"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-semibold text-foreground truncate">
                        {site?.name ?? "현장 정보 없음"}
                      </p>
                      <p className="text-base text-muted-foreground mt-0.5">
                        {customerName ? `${customerName} · ` : ""}v{q.version} ·{" "}
                        {new Date(q.created_at).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-foreground">
                        {q.total_amount.toLocaleString("ko-KR")}원
                      </p>
                      <span
                        className={`inline-block text-sm px-2 py-0.5 rounded-full mt-1 font-medium ${
                          statusColor[q.status] ?? "bg-muted text-muted-foreground"
                        }`}
                      >
                        {statusLabel[q.status] ?? q.status}
                      </span>
                    </div>
                  </div>
                </Link>
                {isDraft && <QuoteListActions quoteId={q.id} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
