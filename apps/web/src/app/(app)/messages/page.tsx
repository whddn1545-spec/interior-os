import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { MessageSquareIcon, ChevronRightIcon } from "lucide-react";
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
    queued: "bg-gray-100 text-gray-600",
    sent: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-600",
  };

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">문자 보내기</h1>

      <Suspense fallback={<div className="bg-white rounded-2xl border border-gray-200 p-5 text-gray-400">불러오는 중...</div>}>
        <MessageWizard
          workers={workersResult.ok ? workersResult.data : []}
          sites={sitesResult.ok ? sitesResult.data : []}
          customers={customersResult.ok ? customersResult.data : []}
        />
      </Suspense>

      {/* 최근 발송 이력 */}
      {recentLogs && recentLogs.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">최근 발송 이력</h2>
          <div className="space-y-2">
            {recentLogs.map((log) => {
              const l = log as unknown as Record<string, unknown>;
              const status = l.status as string;
              return (
                <div key={l.id as string} className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm text-gray-500">
                      {l.target_type === "worker" ? "👷 작업자" : "👤 고객"} · {l.channel as string === "sms" ? "SMS" : "알림톡"}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[status] ?? ""}`}>
                      {statusLabel[status] ?? status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{l.body_masked as string}</p>
                  {(l.sent_at as string | null) && (
                    <p className="text-xs text-gray-400 mt-1">
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
        <div className="mt-8 text-center py-12 text-gray-400">
          <MessageSquareIcon size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg">아직 발송한 문자가 없어요</p>
          <p className="mt-2 text-base text-gray-500">
            ↑ 위에서 대상을 골라 첫 문자를 보내보세요
          </p>
        </div>
      )}
    </div>
  );
}
