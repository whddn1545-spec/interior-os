import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, PhoneIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WorkerEditForm } from "./worker-edit-form";

export default async function WorkerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: worker }, { data: assignments }] = await Promise.all([
    supabase
      .from("workers")
      .select("id, name, phone, company, rating, memo, worker_trades(trades(code, name_ko))")
      .eq("id", id)
      .single(),
    supabase
      .from("assignments")
      .select("id, start_date, end_date, status, sites(name), trades(name_ko)")
      .eq("worker_id", id)
      .order("start_date", { ascending: false })
      .limit(10),
  ]);

  if (!worker) notFound();

  const w = worker as unknown as Record<string, unknown>;
  const wts = (w.worker_trades as { trades: { code: string; name_ko: string } | null }[] | null) ?? [];
  const tradeCodes = wts.map((wt) => wt.trades?.code ?? "").filter(Boolean);

  const STATUS_LABEL: Record<string, string> = {
    proposed: "제안", confirmed: "확정", declined: "거절", done: "완료",
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10 px-4 py-3 flex items-center gap-3">
        <Link href="/workers" className="p-2 -ml-2 text-gray-600">
          <ArrowLeftIcon size={24} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex-1">{w.name as string}</h1>
        <a
          href={`tel:${w.phone as string}`}
          className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-2 rounded-xl text-sm font-medium"
        >
          <PhoneIcon size={16} />
          전화
        </a>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* 편집 폼 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <WorkerEditForm
            worker={{
              id: w.id as string,
              name: w.name as string,
              phone: w.phone as string,
              company: w.company as string | null,
              rating: w.rating as number | null,
              memo: w.memo as string | null,
              tradeCodes,
            }}
          />
        </div>

        {/* 배정 이력 */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">현장 배정 이력</h2>
          {assignments && assignments.length > 0 ? (
            <div className="space-y-2">
              {(assignments as unknown as Record<string, unknown>[]).map((a) => {
                const site = a.sites as { name: string } | null;
                const trade = a.trades as { name_ko: string } | null;
                return (
                  <div key={a.id as string} className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-base font-semibold text-gray-900">{site?.name ?? "-"}</p>
                        <p className="text-sm text-gray-500">
                          {trade?.name_ko ?? ""} · {a.start_date as string}
                          {a.end_date ? ` ~ ${a.end_date as string}` : ""}
                        </p>
                      </div>
                      <span className="text-sm font-medium text-gray-500">
                        {STATUS_LABEL[a.status as string] ?? a.status as string}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-6 text-center">
              <p className="text-base text-gray-700">아직 배정된 현장이 없어요.</p>
              <p className="text-base text-gray-500 mt-1">
                일정 화면에서 이 작업자를 현장에 배정해보세요.
              </p>
              <Link
                href="/schedule"
                className="inline-flex items-center justify-center mt-4 bg-gray-900 text-white px-5 py-4 rounded-xl text-base font-medium"
              >
                일정으로 가기
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
