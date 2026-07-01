import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  FileTextIcon,
  FileSignatureIcon,
  ImageIcon,
  LayoutGridIcon,
  MapPinIcon,
  UserIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GanttChart } from "./gantt-chart";
import { ScheduleSetup } from "./schedule-setup";
import { WorkerAssign } from "./worker-assign";
import { SiteStatusButton } from "./site-status";

const SITE_STATUS_LABEL: Record<string, string> = {
  lead: "상담중",
  quoting: "견적중",
  contracted: "계약완료",
  in_progress: "공사중",
  done: "완료",
  canceled: "취소",
};

export default async function SchedulePage({ params, searchParams }: { params: Promise<{ siteId: string }>; searchParams: Promise<{ from?: string }> }) {
  const { siteId } = await params;
  const { from } = await searchParams;
  const supabase = await createClient();

  const [
    { data: site },
    { data: tasks },
    { data: confirmedQuote },
    { data: workers },
    { data: assignments },
    { data: siteQuotes },
    { data: siteContract },
    { count: photoCount },
  ] = await Promise.all([
    supabase.from("sites").select("*, customers(id, name)").eq("id", siteId).single(),
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
    supabase
      .from("quotes")
      .select("id, version, total_amount, status")
      .eq("site_id", siteId)
      .order("version", { ascending: false }),
    supabase
      .from("contracts")
      .select("id, status")
      .eq("site_id", siteId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("site_id", siteId),
  ]);

  if (!site) notFound();
  const siteAny = site as unknown as Record<string, unknown>;
  const customer = siteAny.customers as { id: string; name: string } | null;
  const hasTasks = tasks && tasks.length > 0;

  const quoteList = (siteQuotes as { id: string; version: number; total_amount: number; status: string }[] | null) ?? [];
  const latestQuote = quoteList[0] ?? null;
  const contract = siteContract as { id: string; status: string } | null;
  const photoTotal = photoCount ?? 0;
  const siteAddress = siteAny.address as string | null;
  const siteStatus = siteAny.status as string;

  // 모든 작업이 끝난(end_date가 오늘 이전) in_progress 현장이면 본문 하단에 큰 '공사 완료' 버튼 노출
  const todayStr = new Date().toISOString().split("T")[0];
  const allTasksFinished =
    !!hasTasks && (tasks ?? []).every((t) => {
      const end = (t as unknown as Record<string, unknown>).end_date as string | null;
      return !!end && end < todayStr;
    });
  const showCompletePrompt = siteStatus === "in_progress" && allTasksFinished;

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
    <div className="min-h-screen bg-muted pb-24">
      <header className="sticky top-0 bg-card border-b border-border z-10 px-4 py-3 flex items-center gap-3">
        <Link href={from ?? "/schedule"} className="p-3 -ml-3 text-muted-foreground" aria-label="뒤로 가기">
          <ArrowLeftIcon size={24} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">{siteAny.name as string}</h1>
          <p className="text-base text-muted-foreground">
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

      {/* 현장 요약 — 현장 단위 네비게이션 허브 */}
      <div className="px-4 pt-6">
        <div className="max-w-2xl mx-auto bg-card rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-foreground">현장 정보</h2>
            <span className="text-base font-semibold text-primary/90 bg-primary/10 px-3 py-1 rounded-full">
              {SITE_STATUS_LABEL[siteStatus] ?? siteStatus}
            </span>
          </div>

          {/* 현장 종합 허브로 이동 — 견적·일정·사진·받을돈을 한 화면에서 */}
          <Link
            href={`/sites/${siteId}?from=/schedule/${siteId}`}
            className="flex items-center gap-2 -mx-1 px-3 py-4 rounded-xl bg-primary/10 text-primary/90 active:bg-blue-100"
          >
            <LayoutGridIcon size={20} className="shrink-0" />
            <span className="flex-1 text-base font-bold">현장 종합 보기</span>
            <ChevronRightIcon size={18} className="text-blue-400 shrink-0" />
          </Link>

          <div className="space-y-2 text-base">
            {customer?.name && (
              <Link
                href={`/customers/${customer.id}`}
                className="flex items-center gap-3 -mx-1 px-1 py-2 rounded-xl active:bg-muted"
              >
                <UserIcon size={20} className="text-muted-foreground/70 shrink-0" />
                <span className="text-muted-foreground w-16 shrink-0">고객</span>
                <span className="flex-1 font-medium text-primary truncate">{customer.name}</span>
                <ChevronRightIcon size={18} className="text-muted-foreground/50 shrink-0" />
              </Link>
            )}
            {siteAddress && (
              <div className="flex items-start gap-3 px-1 py-2">
                <MapPinIcon size={20} className="text-muted-foreground/70 shrink-0 mt-0.5" />
                <span className="text-muted-foreground w-16 shrink-0">주소</span>
                <span className="flex-1 font-medium text-foreground">{siteAddress}</span>
              </div>
            )}
          </div>

          {/* 연결된 견적·계약·사진 바로가기 */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Link
              href={
                latestQuote
                  ? `/quotes/${latestQuote.id}`
                  : customer?.id
                    ? `/quotes/new?customerId=${customer.id}`
                    : "/quotes/new"
              }
              className="flex flex-col items-center justify-center gap-1 bg-muted rounded-2xl py-4 active:bg-muted"
            >
              <FileTextIcon size={22} className="text-primary" />
              <span className="text-base font-semibold text-foreground">견적</span>
              <span className="text-sm text-muted-foreground">
                {quoteList.length > 0 ? `${quoteList.length}건` : "만들기"}
              </span>
            </Link>
            <Link
              href={contract ? `/contracts/${contract.id}?from=/schedule/${siteId}` : `/quotes/${latestQuote?.id ?? ""}`}
              className={`flex flex-col items-center justify-center gap-1 bg-muted rounded-2xl py-4 active:bg-muted ${
                !contract && !latestQuote ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <FileSignatureIcon size={22} className="text-profit" />
              <span className="text-base font-semibold text-foreground">계약</span>
              <span className="text-sm text-muted-foreground">{contract ? "보기" : "없음"}</span>
            </Link>
            <Link
              href={`/photos/${siteId}?from=/schedule/${siteId}`}
              className="flex flex-col items-center justify-center gap-1 bg-muted rounded-2xl py-4 active:bg-muted"
            >
              <ImageIcon size={22} className="text-purple-600" />
              <span className="text-base font-semibold text-foreground">사진</span>
              <span className="text-sm text-muted-foreground">
                {photoTotal > 0 ? `${photoTotal}장` : "올리기"}
              </span>
            </Link>
          </div>
        </div>
      </div>

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
                dependsOn: (tAny.depends_on as string[]) ?? [],
                tradeId: (tAny.trade_id as string | null) ?? "",
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

      {/* 모든 작업이 끝난 진행 중 현장: 크고 명확한 공사 완료 버튼으로 발견성 향상 */}
      {showCompletePrompt && (
        <div className="px-4 pt-6">
          <div className="max-w-2xl mx-auto bg-card rounded-2xl border border-border p-5 space-y-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">모든 작업 일정이 끝났어요</h2>
              <p className="text-base text-muted-foreground mt-1">
                공사가 다 끝났다면 아래 버튼으로 이 현장을 공사 완료로 바꿔주세요.
              </p>
            </div>
            <SiteStatusButton siteId={siteId} currentStatus={siteStatus} variant="block" />
          </div>
        </div>
      )}
    </div>
  );
}
