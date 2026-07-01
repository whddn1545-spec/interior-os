import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { MessageSquareIcon, ArrowLeftIcon } from "lucide-react";
import { MessageWizard } from "./message-wizard";
import { getWorkers, getActiveSites, getCustomers } from "./actions";

export default async function MessagesPage() {
  const supabase = await createClient();

  // 최근 발송 이력
  const { data: recentLogs } = await supabase
    .from("message_logs")
    .select("id, target_type, body_masked, status, sent_at, channel")
    .order("created_at", { ascending: false })
    .limit(20);

  const workersResult = await getWorkers();
  const sitesResult = await getActiveSites();
  const customersResult = await getCustomers();

  const statusLabel: Record<string, string> = { queued: "대기중", sent: "발송됨", failed: "실패" };
  const statusColor: Record<string, string> = {
    queued: "bg-muted text-muted-foreground",
    sent: "bg-green-100 text-profit",
    failed: "bg-red-100 text-loss",
  };

  return (
    <div className="px-4 pt-6 pb-24">
      {/* 홈으로 돌아가기 (더보기 메뉴로 진입 시 길 잃지 않도록) */}
      <Link
        href="/"
        className="mb-3 -ml-2 inline-flex h-14 items-center gap-2 rounded-xl px-2 text-base font-semibold text-muted-foreground active:bg-muted"
      >
        <ArrowLeftIcon size={24} />
        홈으로
      </Link>

      <h1 className="text-2xl font-bold text-foreground mb-6">문자 보내기</h1>

      <Suspense fallback={<div className="bg-card rounded-2xl border border-border p-5 text-muted-foreground/70">불러오는 중...</div>}>
        <MessageWizard
          workers={workersResult.ok ? workersResult.data : []}
          sites={sitesResult.ok ? sitesResult.data : []}
          customers={customersResult.ok ? customersResult.data : []}
        />
      </Suspense>

      {/* 최근 발송 이력 */}
      {recentLogs && recentLogs.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">최근 발송 이력</h2>
          <div className="space-y-2">
            {recentLogs.map((log) => {
              const l = log as unknown as Record<string, unknown>;
              const status = l.status as string;
              return (
                <div key={l.id as string} className="bg-card border border-border rounded-2xl px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm text-muted-foreground">
                      {l.target_type === "worker" ? "👷 작업자" : "👤 고객"} · {l.channel as string === "sms" ? "SMS" : "알림톡"}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[status] ?? ""}`}>
                      {statusLabel[status] ?? status}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 line-clamp-2">{l.body_masked as string}</p>
                  {(l.sent_at as string | null) && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {new Date(l.sent_at as string).toLocaleString("ko-KR")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(!recentLogs || recentLogs.length === 0) && (
        <div className="mt-8 text-center py-12 text-muted-foreground/70">
          <MessageSquareIcon size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg">아직 발송한 문자가 없어요</p>
          <p className="mt-2 text-base text-muted-foreground">
            ↑ 위에서 대상을 골라 첫 문자를 보내보세요
          </p>
        </div>
      )}
    </div>
  );
}
