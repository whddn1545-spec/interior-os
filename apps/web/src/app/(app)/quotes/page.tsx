import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function QuotesPage() {
  const supabase = await createClient();
  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, version, status, total_amount, created_at, sites(name)")
    .order("created_at", { ascending: false })
    .limit(50);

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

      {!quotes || quotes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-xl mb-2">아직 견적이 없어요</p>
          <p className="text-base">위의 "새 견적" 버튼을 눌러 시작하세요</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {quotes.map((q) => {
            const site = q.sites as unknown as { name: string } | null;
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
                        v{q.version} ·{" "}
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
