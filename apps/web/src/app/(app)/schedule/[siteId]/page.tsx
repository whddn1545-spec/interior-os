import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, CalendarIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GanttChart } from "./gantt-chart";
import { ScheduleSetup } from "./schedule-setup";

export default async function SchedulePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const supabase = await createClient();

  const { data: site } = await supabase
    .from("sites")
    .select("*, customers(name)")
    .eq("id", siteId)
    .single();

  if (!site) notFound();
  const siteAny = site as unknown as Record<string, unknown>;
  const customer = siteAny.customers as { name: string } | null;

  const { data: tasks } = await supabase
    .from("schedule_tasks")
    .select("*, trades(name_ko, code)")
    .eq("site_id", siteId)
    .order("start_date", { ascending: true });

  // 견적에서 일정 생성 가능 여부 확인
  const { data: confirmedQuote } = await supabase
    .from("quotes")
    .select("id, version")
    .eq("site_id", siteId)
    .eq("status", "confirmed")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasTasks = tasks && tasks.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-2 -ml-2 text-gray-600">
          <ArrowLeftIcon size={24} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{siteAny.name as string}</h1>
          <p className="text-sm text-gray-500">{customer?.name ?? ""} · 공사 일정</p>
        </div>
        <CalendarIcon size={22} className="text-gray-400" />
      </header>

      <div className="px-4 pt-6">
        {hasTasks ? (
          <GanttChart
            tasks={(tasks ?? []).map((t) => {
              const tAny = t as unknown as Record<string, unknown>;
              const trade = tAny.trades as { name_ko: string; code: string } | null;
              return {
                id: tAny.id as string,
                title: tAny.title as string,
                tradeNameKo: trade?.name_ko ?? "",
                startDate: tAny.start_date as string,
                endDate: tAny.end_date as string,
                durationDays: tAny.duration_days as number,
                kind: tAny.kind as "work" | "reserve" | "contingency",
                status: tAny.status as string,
              };
            })}
            siteId={siteId}
            siteName={siteAny.name as string}
          />
        ) : (
          <ScheduleSetup
            siteId={siteId}
            confirmedQuoteId={confirmedQuote?.id ?? null}
          />
        )}
      </div>
    </div>
  );
}
