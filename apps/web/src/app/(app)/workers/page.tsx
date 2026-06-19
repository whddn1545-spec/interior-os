import Link from "next/link";
import { PlusIcon, PhoneIcon, ChevronRightIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function WorkersPage() {
  const supabase = await createClient();

  const { data: workers } = await supabase
    .from("workers")
    .select("id, name, phone, company, rating, is_active, worker_trades(trades(name_ko))")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">작업자</h1>
        <Link
          href="/workers/new"
          className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-base font-semibold"
        >
          <PlusIcon size={18} />
          추가
        </Link>
      </div>

      {!workers || workers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-xl mb-2">등록된 작업자가 없어요</p>
          <p className="text-base">함께 일하는 작업자를 추가해보세요</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {workers.map((w) => {
            const wAny = w as unknown as Record<string, unknown>;
            const wts = (wAny.worker_trades as { trades: { name_ko: string } | null }[] | null) ?? [];
            const tradeNames = wts.map((wt) => wt.trades?.name_ko ?? "").filter(Boolean).join(", ");
            const rating = wAny.rating as number | null;
            return (
              <li key={wAny.id as string}>
                <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl font-bold text-gray-600 shrink-0">
                    {(wAny.name as string).charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold text-gray-900">{wAny.name as string}</p>
                      {rating !== null && (
                        <span className="text-sm text-amber-500">{"★".repeat(Math.round(rating))}</span>
                      )}
                    </div>
                    <p className="text-base text-gray-500 truncate">{tradeNames || "다능"}</p>
                    {(wAny.company as string | null) && (
                      <p className="text-sm text-gray-400">{wAny.company as string}</p>
                    )}
                  </div>
                  <a
                    href={`tel:${wAny.phone as string}`}
                    className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-2 rounded-xl text-sm font-medium shrink-0"
                  >
                    <PhoneIcon size={16} />
                    전화
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
