import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

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
    draft: "bg-gray-100 text-gray-600",
    confirmed: "bg-blue-100 text-blue-700",
    sent: "bg-green-100 text-green-700",
    accepted: "bg-purple-100 text-purple-700",
    rejected: "bg-red-100 text-red-600",
  };

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">견적</h1>
        <Link
          href="/quotes/new"
          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-base font-semibold"
        >
          <PlusIcon size={18} />
          새 견적
        </Link>
      </div>

      {/* 이번달 요약 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-blue-700">{monthConfirmed.length}건</p>
          <p className="text-sm text-gray-500">이번달 확정 견적</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
          <p className="text-lg font-black text-green-700">{monthTotal.toLocaleString("ko-KR")}원</p>
          <p className="text-sm text-gray-500">이번달 견적 총액</p>
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
                  ? "bg-blue-700 text-white"
                  : "bg-gray-100 text-gray-700 active:bg-gray-200"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {allQuotes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-xl mb-2">아직 견적이 없어요</p>
          <p className="text-base">위의 "새 견적" 버튼을 눌러 시작하세요</p>
        </div>
      ) : visibleQuotes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-xl mb-2">해당 상태의 견적이 없어요</p>
          <p className="text-base">다른 탭을 눌러보세요</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visibleQuotes.map((q) => {
            const site = q.sites as unknown as { name: string; customers: { name: string } | null } | null;
            const customerName = site?.customers?.name ?? null;
            return (
              <li key={q.id}>
                <Link
                  href={`/quotes/${q.id}`}
                  className="block bg-white border border-gray-200 rounded-2xl px-4 py-4 hover:border-blue-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-semibold text-gray-900 truncate">
                        {site?.name ?? "현장 정보 없음"}
                      </p>
                      <p className="text-base text-gray-500 mt-0.5">
                        {customerName ? `${customerName} · ` : ""}v{q.version} ·{" "}
                        {new Date(q.created_at).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-gray-900">
                        {q.total_amount.toLocaleString("ko-KR")}원
                      </p>
                      <span
                        className={`inline-block text-sm px-2 py-0.5 rounded-full mt-1 font-medium ${
                          statusColor[q.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {statusLabel[q.status] ?? q.status}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
