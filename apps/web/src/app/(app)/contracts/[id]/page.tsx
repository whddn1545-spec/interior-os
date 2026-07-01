import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, CheckCircleIcon, AlertTriangleIcon, FileTextIcon, ChevronRightIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatKRW } from "@interior-os/core/pricing";
import { ContractActions } from "./contract-actions";

export default async function ContractDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> }) {
  const { id } = await params;
  const { from } = await searchParams;
  const supabase = await createClient();

  const { data: contract } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", id)
    .single();

  if (!contract) notFound();
  const c = contract as unknown as Record<string, unknown>;

  const { data: quote } = await supabase
    .from("quotes")
    .select("total_amount, version, sites(name, address, customers(name, phone))")
    .eq("id", c.quote_id as string)
    .single();

  const quoteAny = quote as unknown as {
    total_amount: number; version: number;
    sites: { name: string; address: string; customers: { name: string; phone: string } | null } | null;
  } | null;

  const paymentTerms = c.payment_terms as { deposit: number; interim: number; final: number; totalAmount: number } | null;
  const total = quoteAny?.total_amount ?? paymentTerms?.totalAmount ?? 0;

  const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: "임시저장", color: "bg-gray-100 text-gray-600" },
    confirmed: { label: "확정됨", color: "bg-blue-100 text-blue-700" },
    signed: { label: "서명완료", color: "bg-green-100 text-green-700" },
  };
  const status = c.status as string;
  const cfg = statusConfig[status] ?? statusConfig.draft;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10 px-4 py-3 flex items-center gap-3">
        <Link href={from ?? "/quotes"} className="p-3 -ml-3 text-gray-600">
          <ArrowLeftIcon size={24} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">계약서</h1>
          <p className="text-sm text-gray-500">{quoteAny?.sites?.name ?? ""}</p>
        </div>
        <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${cfg.color}`}>
          {cfg.label}
        </span>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        {/* 현장/고객 정보 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">계약 당사자</h2>
          <div className="space-y-2 text-base">
            {quoteAny?.sites?.customers && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">고객명</span>
                  <span className="font-medium">{quoteAny.sites.customers.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">연락처</span>
                  <a href={`tel:${quoteAny.sites.customers.phone}`} className="font-medium text-blue-600">{quoteAny.sites.customers.phone}</a>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">현장</span>
              <span className="font-medium text-right">{quoteAny?.sites?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">주소</span>
              <span className="font-medium text-right max-w-[220px]">{quoteAny?.sites?.address ?? "—"}</span>
            </div>
          </div>
        </div>

        {/* 계약금 분할 */}
        {paymentTerms && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">대금 지급 일정</h2>
            <div className="space-y-2 text-base">
              <div className="flex justify-between">
                <span className="text-gray-600">계약금 ({((paymentTerms.deposit ?? 0) * 100).toFixed(0)}%)</span>
                <span className="font-semibold text-gray-900">{formatKRW(total * (paymentTerms.deposit ?? 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">중도금 ({((paymentTerms.interim ?? 0) * 100).toFixed(0)}%)</span>
                <span className="font-semibold text-gray-900">{formatKRW(total * (paymentTerms.interim ?? 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">잔금 ({((paymentTerms.final ?? 0) * 100).toFixed(0)}%)</span>
                <span className="font-semibold text-gray-900">{formatKRW(total * (paymentTerms.final ?? 0))}</span>
              </div>
              <hr className="border-gray-200" />
              <div className="flex justify-between text-xl font-bold text-gray-900">
                <span>총 계약금액</span>
                <span className="text-blue-700">{formatKRW(total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 원본 견적 연결 */}
        {(c.quote_id as string | null) && (
          <Link
            href={`/quotes/${c.quote_id}`}
            className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3 min-h-[56px] active:bg-gray-50"
          >
            <FileTextIcon size={24} className="text-blue-600 shrink-0" />
            <div className="flex-1">
              <p className="text-base font-semibold text-gray-900">이 계약의 원본 견적 보기</p>
              <p className="text-sm text-gray-500">금액 근거가 된 견적서를 확인할 수 있어요</p>
            </div>
            <ChevronRightIcon size={22} className="text-gray-400 shrink-0" />
          </Link>
        )}

        {/* 특약사항 */}
        {(c.special_terms as string | null) && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">특약사항</h2>
            <p className="text-base text-gray-700 whitespace-pre-line">{c.special_terms as string}</p>
          </div>
        )}

        {/* draft 경고 */}
        {status === "draft" && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangleIcon size={22} className="text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-base font-semibold text-orange-800">계약서를 확인해주세요</p>
              <p className="text-sm text-orange-700 mt-0.5">내용을 검토 후 "확정"을 눌러야 고객에게 보낼 수 있어요</p>
            </div>
          </div>
        )}

        {status === "confirmed" && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
            <CheckCircleIcon size={22} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-base text-blue-800 font-medium">계약서가 확정되었어요. PDF를 생성하거나 서명 요청을 보낼 수 있어요.</p>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <p className="text-sm text-yellow-800">⚠️ 이 계약서는 AI가 생성한 표준 양식입니다. 법적 효력은 전문가 검토를 권장합니다.</p>
        </div>

        <ContractActions contractId={id} status={status} siteId={c.site_id as string} />
      </div>
    </div>
  );
}
