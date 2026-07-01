import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKRW } from "@interior-os/core/pricing";
import type { Metadata } from "next";
import { SignButton } from "./sign-button";

export const dynamic = "force-dynamic";

interface PaymentTerms {
  deposit: number;
  interim: number;
  final: number;
  totalAmount?: number;
}

interface ContractData {
  id: string;
  status: string;
  special_terms: string | null;
  payment_terms: PaymentTerms | null;
  created_at: string;
  site_id: string;
  quote_id: string;
}

interface SiteData {
  name: string;
  address: string | null;
  tenant_id: string;
  customers: { name: string; phone: string } | null;
}

interface TenantData {
  business_name: string;
  owner_name: string;
}

interface QuoteData {
  total_amount: number;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const admin = createAdminClient();
  const { data } = await admin
    .from("contracts")
    .select("quotes(sites(name, customers(name)))")
    .eq("id", id)
    .single();
  const d = data as unknown as { quotes: { sites: { name: string; customers: { name: string } | null } | null } | null } | null;
  const siteName = d?.quotes?.sites?.name ?? "계약서";
  const customerName = d?.quotes?.sites?.customers?.name ?? "";
  return {
    title: `${siteName} 계약서${customerName ? ` — ${customerName}님` : ""}`,
    description: "인테리어 공사 계약서를 확인하고 서명해주세요",
  };
}

export default async function PublicContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: contract } = await admin
    .from("contracts")
    .select("id, status, special_terms, payment_terms, created_at, site_id, quote_id")
    .eq("id", id)
    .single();

  if (!contract) notFound();

  const c = contract as unknown as ContractData;

  // draft는 공개 접근 불가
  if (c.status === "draft") notFound();

  const [{ data: site }, { data: quote }] = await Promise.all([
    admin.from("sites").select("name, address, tenant_id, customers(name, phone)").eq("id", c.site_id).single(),
    admin.from("quotes").select("total_amount").eq("id", c.quote_id).single(),
  ]);

  if (!site) notFound();

  const s = site as unknown as SiteData;
  const q = quote as unknown as QuoteData | null;

  const { data: tenant } = await admin
    .from("tenants")
    .select("business_name, owner_name")
    .eq("id", s.tenant_id)
    .single();

  const t = tenant as unknown as TenantData | null;

  const paymentTerms = c.payment_terms;
  const total = q?.total_amount ?? paymentTerms?.totalAmount ?? 0;

  const contractDate = new Date(c.created_at).toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  });

  const customerName = s.customers?.name ?? "";

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="bg-profit text-white px-6 py-8">
        <p className="text-sm font-medium text-white/70 mb-1">인테리어 공사 계약서</p>
        <h1 className="text-2xl font-black">{s.name}</h1>
        {customerName && (
          <p className="text-white/80 mt-1">{customerName}님</p>
        )}
        <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between">
          <div>
            <p className="text-sm text-white/70">시공 업체</p>
            <p className="text-base font-bold">{t?.business_name ?? ""}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/70">계약 일자</p>
            <p className="text-base font-bold">{contractDate}</p>
          </div>
        </div>
        {c.status === "signed" && (
          <div className="mt-4 bg-white/20 rounded-xl px-4 py-2 text-center">
            <p className="text-sm font-bold">✅ 서명 완료된 계약서</p>
          </div>
        )}
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 pb-16 space-y-5">
        {/* 계약 당사자 */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">계약 당사자</p>
          <div className="space-y-2 text-base">
            <div className="flex justify-between">
              <span className="text-muted-foreground">고객</span>
              <span className="font-semibold text-foreground">{customerName || "—"}</span>
            </div>
            {s.customers?.phone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">연락처</span>
                <a href={`tel:${s.customers.phone}`} className="font-semibold text-primary">{s.customers.phone}</a>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">시공 현장</span>
              <span className="font-semibold text-foreground">{s.name}</span>
            </div>
            {s.address && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">주소</span>
                <span className="font-semibold text-foreground text-right max-w-[200px]">{s.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* 대금 지급 일정 */}
        {paymentTerms && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">대금 지급 일정</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-foreground">계약금</p>
                  <p className="text-sm text-muted-foreground">{((paymentTerms.deposit ?? 0) * 100).toFixed(0)}% · 계약 시</p>
                </div>
                <p className="text-lg font-bold text-foreground">{formatKRW(total * (paymentTerms.deposit ?? 0))}</p>
              </div>
              <hr className="border-border" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-foreground">중도금</p>
                  <p className="text-sm text-muted-foreground">{((paymentTerms.interim ?? 0) * 100).toFixed(0)}% · 공사 중간</p>
                </div>
                <p className="text-lg font-bold text-foreground">{formatKRW(total * (paymentTerms.interim ?? 0))}</p>
              </div>
              <hr className="border-border" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-foreground">잔금</p>
                  <p className="text-sm text-muted-foreground">{((paymentTerms.final ?? 0) * 100).toFixed(0)}% · 완공 후</p>
                </div>
                <p className="text-lg font-bold text-foreground">{formatKRW(total * (paymentTerms.final ?? 0))}</p>
              </div>
            </div>

            {/* 총 계약 금액 */}
            <div className="mt-4 bg-profit/10 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-base font-bold text-foreground">총 계약 금액</p>
                <p className="text-2xl font-black text-profit tabular-nums">{formatKRW(total)}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">부가세 별도</p>
            </div>
          </div>
        )}

        {/* 특약사항 */}
        {c.special_terms && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">특약사항</p>
            <p className="text-base text-foreground/90 whitespace-pre-line leading-relaxed">{c.special_terms}</p>
          </div>
        )}

        {/* 법적 안내 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
          <p className="text-sm text-yellow-800">⚠️ 이 계약서는 AI가 생성한 표준 양식입니다. 법적 효력은 전문가 검토를 권장합니다.</p>
        </div>

        {/* 서명 버튼 */}
        {(c.status === "confirmed" || c.status === "signed") && (
          <SignButton
            contractId={c.id}
            siteName={s.name}
            totalAmount={total}
            customerName={customerName}
            isAlreadySigned={c.status === "signed"}
          />
        )}

        {/* 업체 정보 */}
        {t && (
          <div className="bg-muted rounded-2xl p-5 text-center">
            <p className="text-base font-bold text-foreground mb-1">
              궁금한 점이 있으시면 연락해주세요
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              {t.business_name} · {t.owner_name}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-4">
              Powered by InteriorOS
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
