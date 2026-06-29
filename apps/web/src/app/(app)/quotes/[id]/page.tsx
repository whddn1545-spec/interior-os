import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, CheckCircleIcon, AlertTriangleIcon, FileTextIcon, SendIcon, ChevronRightIcon, LayoutGridIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { QuoteActions } from "./quote-actions";
import { formatKRW } from "@interior-os/core/pricing";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (!quote) notFound();

  const quoteAny = quote as unknown as Record<string, unknown>;

  const { data: items } = await supabase
    .from("quote_items")
    .select("*, trades(name_ko, unit)")
    .eq("quote_id", id)
    .order("created_at");

  const { data: site } = await supabase
    .from("sites")
    .select("id, name, address, customer_id, customers(name, phone)")
    .eq("id", quoteAny.site_id as string)
    .single();

  const siteAny = site as unknown as {
    id: string; name: string; address: string; customer_id: string | null;
    customers: { name: string; phone: string } | null;
  } | null;

  // 이 견적으로 만든 계약서 조회 (역방향 링크용, DB 변경 없이 quote_id 조인)
  const { data: contract } = await supabase
    .from("contracts")
    .select("id, status, created_at")
    .eq("quote_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const contractAny = contract as unknown as {
    id: string; status: string;
  } | null;

  const contractStatusLabel: Record<string, string> = {
    draft: "임시저장",
    confirmed: "확정됨",
    signed: "서명완료",
  };

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    draft: { label: "임시저장", color: "bg-gray-100 text-gray-600", icon: null },
    confirmed: { label: "확정됨", color: "bg-blue-100 text-blue-700", icon: <CheckCircleIcon size={16} /> },
    sent: { label: "발송됨", color: "bg-green-100 text-green-700", icon: <SendIcon size={16} /> },
    accepted: { label: "계약됨", color: "bg-purple-100 text-purple-700", icon: <CheckCircleIcon size={16} /> },
    rejected: { label: "거절됨", color: "bg-red-100 text-red-600", icon: null },
  };

  const status = quoteAny.status as string;
  const cfg = statusConfig[status] ?? statusConfig.draft;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10 px-4 py-3 flex items-center gap-3">
        <Link href="/quotes" className="p-2 -ml-2 text-gray-600">
          <ArrowLeftIcon size={24} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{siteAny?.name ?? "견적서"}</h1>
          <p className="text-sm text-gray-500">v{quoteAny.version as number} · {siteAny?.customers?.name ?? ""}</p>
        </div>
        <span className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-full font-medium ${cfg.color}`}>
          {cfg.icon}{cfg.label}
        </span>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        {/* 현장 정보 */}
        {siteAny && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">현장 정보</h2>
            <div className="space-y-2 text-base text-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-500">고객</span>
                <span className="font-medium">{siteAny.customers?.name ?? "—"} {siteAny.customers?.phone ?? ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">주소</span>
                <span className="font-medium text-right max-w-[220px]">{siteAny.address}</span>
              </div>
            </div>
            {/* 현장 종합 허브 — 이 현장의 견적·일정·사진·받을돈을 한 화면에서 */}
            <Link
              href={`/sites/${siteAny.id}?from=/quotes/${id}`}
              className="mt-3 flex items-center gap-2 px-3 py-4 rounded-xl bg-blue-50 text-blue-700 active:bg-blue-100"
            >
              <LayoutGridIcon size={20} className="shrink-0" />
              <span className="flex-1 text-base font-bold">현장 종합 보기</span>
              <ChevronRightIcon size={18} className="text-blue-400 shrink-0" />
            </Link>
          </div>
        )}

        {/* 견적 항목 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">견적 항목</h2>
          <div className="space-y-3">
            {(items ?? []).map((item) => {
              const itemAny = item as unknown as Record<string, unknown>;
              const trade = itemAny.trades as { name_ko: string; unit: string } | null;
              return (
                <div key={itemAny.id as string} className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-base font-medium text-gray-900">
                      {trade?.name_ko ?? ""} · {itemAny.description as string}
                    </p>
                    <p className="text-sm text-gray-500">
                      {(itemAny.quantity as number).toLocaleString("ko-KR")} {trade?.unit ?? itemAny.unit as string} ·
                      자재 {formatKRW(itemAny.material_cost as number)} + 인건비 {formatKRW(itemAny.labor_cost as number)}
                    </p>
                  </div>
                  <p className="text-base font-semibold text-gray-900 shrink-0">
                    {formatKRW(itemAny.line_total as number)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 금액 합계 */}
        {(() => {
          const subtotal = quoteAny.subtotal as number;
          const distanceFactor = quoteAny.distance_factor as number;
          const difficultyFactor = quoteAny.difficulty_factor as number;
          // 소계에 거리 계수를 적용한 중간 금액
          const afterDistance = subtotal * distanceFactor;
          // 거리 계수가 더하는 증분
          const distanceDelta = afterDistance - subtotal;
          // 거리 계수까지 적용한 금액에 난이도 계수를 적용한 중간 금액
          const afterDifficulty = afterDistance * difficultyFactor;
          // 난이도 계수가 더하는 증분(직전 단계 금액 기준)
          const difficultyDelta = afterDifficulty - afterDistance;
          return (
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">금액 내역</h2>
          <div className="space-y-2 text-base">
            <div className="flex justify-between text-gray-600">
              <span>항목 소계</span>
              <span>{formatKRW(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>거리 계수 × {distanceFactor}</span>
              <span>+{formatKRW(distanceDelta)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>난이도 계수 × {difficultyFactor}</span>
              <span>+{formatKRW(difficultyDelta)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>예비 ({((quoteAny.reserve_rate as number) * 100).toFixed(0)}%)</span>
              <span>+{formatKRW((quoteAny.total_amount as number) * (quoteAny.reserve_rate as number) / (1 + (quoteAny.reserve_rate as number) + (quoteAny.contingency_rate as number)))}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>비상 ({((quoteAny.contingency_rate as number) * 100).toFixed(0)}%)</span>
              <span>+{formatKRW((quoteAny.total_amount as number) * (quoteAny.contingency_rate as number) / (1 + (quoteAny.reserve_rate as number) + (quoteAny.contingency_rate as number)))}</span>
            </div>
            <hr className="border-gray-200" />
            <div className="flex justify-between text-xl font-bold text-gray-900">
              <span>최종 합계</span>
              <span className="text-blue-700">{formatKRW(quoteAny.total_amount as number)}</span>
            </div>
          </div>
        </div>
          );
        })()}

        {/* draft 경고 */}
        {status === "draft" && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangleIcon size={22} className="text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-base font-semibold text-orange-800">아직 확정되지 않은 견적이에요</p>
              <p className="text-sm text-orange-700 mt-0.5">금액을 검토한 후 "확정하기"를 눌러야 고객에게 보낼 수 있어요</p>
            </div>
          </div>
        )}

        {/* 확정된 경우 PDF/계약 버튼 */}
        {(status === "confirmed" || status === "sent" || status === "accepted") && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
              <CheckCircleIcon size={22} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-base font-semibold text-blue-800">견적이 확정되었어요</p>
                <p className="text-sm text-blue-700 mt-0.5">이제 공사 일정을 만들거나, PDF 생성·문자 발송·계약서 작성을 할 수 있어요</p>
              </div>
            </div>

            {/* 이 견적으로 만든 계약서 보기 (역방향 링크) */}
            {contractAny && (
              <Link
                href={`/contracts/${contractAny.id}?from=/quotes/${id}`}
                className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3 min-h-[56px] active:bg-gray-50"
              >
                <FileTextIcon size={24} className="text-purple-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-base font-semibold text-gray-900">이 견적으로 만든 계약서 보기</p>
                  <p className="text-sm text-gray-500">
                    계약서 상태: {contractStatusLabel[contractAny.status] ?? contractAny.status}
                  </p>
                </div>
                <ChevronRightIcon size={22} className="text-gray-400 shrink-0" />
              </Link>
            )}

            {/* 공사 일정 만들기 CTA */}
            {siteAny && (
              <Link
                href={`/schedule/${siteAny.id}`}
                className="flex items-center justify-center gap-2 w-full bg-green-600 text-white rounded-2xl py-5 text-xl font-bold active:bg-green-700"
              >
                📅 공사 일정 만들기
              </Link>
            )}
          </>
        )}

        {/* 견적 PDF 다운로드 링크 */}
        {(quoteAny.customer_pdf_url as string | null) && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">견적서 PDF</h2>
            <div className="space-y-2">
              <a
                href={quoteAny.customer_pdf_url as string}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 w-full bg-blue-600 text-white rounded-xl px-4 py-3 text-base font-semibold"
              >
                <FileTextIcon size={20} />
                고객용 견적서 열기
              </a>
              {(quoteAny.internal_pdf_url as string | null) && (
                <a
                  href={quoteAny.internal_pdf_url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full bg-gray-100 text-gray-700 rounded-xl px-4 py-3 text-base font-semibold"
                >
                  <FileTextIcon size={20} />
                  내부용(원가 포함) 열기
                </a>
              )}
            </div>
          </div>
        )}

        {/* 인터랙티브 액션 */}
        <QuoteActions
          quoteId={id}
          status={status}
          siteId={siteAny?.id ?? ""}
          customerId={siteAny?.customer_id ?? ""}
          totalAmount={quoteAny.total_amount as number}
        />
      </div>
    </div>
  );
}
