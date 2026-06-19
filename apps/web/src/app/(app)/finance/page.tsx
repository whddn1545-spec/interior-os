import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react";

export default async function FinancePage() {
  const supabase = await createClient();

  // 이번 달 수입/지출
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const { data: entries } = await supabase
    .from("finance_entries")
    .select("id, direction, amount, category, paid_at, memo, sites(name)")
    .gte("paid_at", startOfMonth)
    .lte("paid_at", endOfMonth)
    .order("paid_at", { ascending: false });

  const totalIn = (entries ?? [])
    .filter((e) => (e as unknown as { direction: string }).direction === "in")
    .reduce((s, e) => s + ((e as unknown as { amount: number }).amount ?? 0), 0);

  const totalOut = (entries ?? [])
    .filter((e) => (e as unknown as { direction: string }).direction === "out")
    .reduce((s, e) => s + ((e as unknown as { amount: number }).amount ?? 0), 0);

  const CATEGORY_LABEL: Record<string, string> = {
    customer_payment: "고객 입금", material: "자재비", labor: "인건비",
    outsourcing: "외주비", etc: "기타",
  };

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">매출 관리</h1>

      {/* 이번 달 요약 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
          <TrendingUpIcon size={20} className="mx-auto text-green-600 mb-1" />
          <p className="text-xl font-black text-green-700">{(totalIn / 10000).toFixed(0)}만</p>
          <p className="text-sm text-gray-500">이번 달 수입</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
          <TrendingDownIcon size={20} className="mx-auto text-red-500 mb-1" />
          <p className="text-xl font-black text-red-600">{(totalOut / 10000).toFixed(0)}만</p>
          <p className="text-sm text-gray-500">이번 달 지출</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-500 mt-5">순이익</p>
          <p className={`text-xl font-black ${totalIn - totalOut >= 0 ? "text-blue-700" : "text-red-600"}`}>
            {((totalIn - totalOut) / 10000).toFixed(0)}만
          </p>
        </div>
      </div>

      {/* 입출금 내역 */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold text-gray-800">
          {now.getMonth() + 1}월 입출금 내역
        </h2>
        <span className="text-base text-gray-500">{(entries ?? []).length}건</span>
      </div>

      {!entries || entries.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <p className="text-lg">이번 달 내역이 없어요</p>
          <p className="text-base mt-1">현장에서 입출금을 기록해보세요</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => {
            const eAny = e as unknown as Record<string, unknown>;
            const isIn = eAny.direction === "in";
            const site = eAny.sites as { name: string } | null;
            return (
              <div key={eAny.id as string} className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-base font-semibold text-gray-900">
                      {CATEGORY_LABEL[eAny.category as string] ?? eAny.category as string}
                    </p>
                    <p className="text-sm text-gray-500">
                      {site?.name ?? ""} · {eAny.paid_at as string}
                    </p>
                    {(eAny.memo as string | null) && (
                      <p className="text-sm text-gray-400">{eAny.memo as string}</p>
                    )}
                  </div>
                  <p className={`text-xl font-bold shrink-0 ${isIn ? "text-green-600" : "text-red-500"}`}>
                    {isIn ? "+" : "-"}{((eAny.amount as number)).toLocaleString("ko-KR")}원
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
