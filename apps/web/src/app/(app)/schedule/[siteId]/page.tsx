import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GanttChart } from "./gantt-chart";
import { ScheduleSetup } from "./schedule-setup";
import { WorkerAssign } from "./worker-assign";
import { SiteStatusButton } from "./site-status";

export default async function SchedulePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const supabase = await createClient();

  const [{ data: site }, { data: tasks }, { data: confirmedQuote }, { data: workers }, { data: assignments }] = await Promise.all([
    supabase.from("sites").select("*, customers(name)").eq("id", siteId).single(),
    supabase
      .from("schedule_tasks")
      .select("*, trades(name_ko, code)")
      .eq("site_id", siteId)
      .order("start_date", { ascending: true }),
    supabase
      .from("quotes")
      .select("id, version")
      .eq("site_id", siteId)
      .eq("status", "confirmed")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("workers")
      .select("id, name, phone, worker_trades(trades(code))")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("assignments")
      .select("id, worker_id, status, workers(name, phone)")
      .eq("site_id", siteId)
      .order("created_at", { ascending: false }),
  ]);

  if (!site) notFound();
  const siteAny = site as unknown as Record<string, unknown>;
  const customer = siteAny.customers as { name: string } | null;
  const hasTasks = tasks && tasks.length > 0;

  const workerList = (workers ?? []).map((w) => {
    const wAny = w as unknown as Record<string, unknown>;
    const wts = (wAny.worker_trades as { trades: { code: string } | null }[] | null) ?? [];
    return {
      id: wAny.id as string,
      name: wAny.name as string,
      phone: wAny.phone as string,
      tradeCodes: wts.map((wt) => wt.trades?.code ?? "").filter(Boolean),
    };
  });

  const taskList = (tasks ?? []).map((t) => {
    const tAny = t as unknown as Record<string, unknown>;
    const trade = tAny.trades as { name_ko: string; code: string } | null;
    return {
      id: tAny.id as string,
      title: tAny.title as string,
      tradeId: tAny.trade_id as string | null,
      tradeCode: trade?.code ?? null,
      startDate: tAny.start_date as string,
      endDate: tAny.end_date as string,
    };
  }).filter((t) => t.tradeCode !== null);

  const assignmentList = (assignments ?? []).map((a) => {
    const aAny = a as unknown as Record<string, unknown>;
    const worker = aAny.workers as { name: string; phone: string } | null;
    return {
      workerId: aAny.worker_id as string,
      workerName: worker?.name ?? "",
      workerPhone: worker?.phone ?? "",
      status: aAny.status as string,
    };
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10 px-4 py-3 flex items-center gap-3">
        <Link href="/schedule" className="p-3 -ml-3 text-gray-600" aria-label="일정 목록으로">
          <ArrowLeftIcon size={24} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{siteAny.name as string}</h1>
          <p className="text-base text-gray-500">
            {customer?.name ? `${customer.name} · ` : ""}
            {hasTasks ? "공사 일정" : "공사 일정 만들기"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SiteStatusButton siteId={siteId} currentStatus={siteAny.status as string} />
          {hasTasks && (
            <WorkerAssign
              siteId={siteId}
              tasks={taskList}
              workers={workerList}
              assignments={assignmentList}
            />
          )}
        </div>
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
