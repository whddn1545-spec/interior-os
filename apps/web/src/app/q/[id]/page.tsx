import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatKRW } from "@interior-os/core/pricing";
import type { Metadata } from "next";
import { AcceptButton } from "./accept-button";

export const dynamic = "force-dynamic";

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  line_total: number;
  trades: { name_ko: string } | null;
}

interface QuoteData {
  id: string;
  version: number;
  status: string;
  total_amount: number;
  created_at: string;
  site_id: string;
}

interface SiteData {
  name: string;
  address: string | null;
  tenant_id: string;
  customers: { name: string } | null;
}

interface TenantData {
  business_name: string;
  owner_name: string;
  owner_phone: string | null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: quote } = await admin.from("quotes").select("sites(name, customers(name))").eq("id", id).single();
  const q = quote as unknown as { sites: { name: string; customers: { name: string } | null } | null } | null;
  const siteName = q?.sites?.name ?? "견적서";
  const customerName = q?.sites?.customers?.name ?? "";
  const title = `${siteName} 견적서${customerName ? ` — ${customerName}님` : ""}`;
  const description = "인테리어 리모델링 견적서를 확인해주세요";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function PublicQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const [{ data: quote }, { data: items }] = await Promise.all([
    // 주의: quotes에 없는 컬럼을 select하면 PostgREST 에러 → 모든 링크가 404가 된다
    admin.from("quotes").select("id, version, status, total_amount, created_at, site_id").eq("id", id).single(),
    admin.from("quote_items").select("id, description, quantity, unit, line_total, trades(name_ko)").eq("quote_id", id).order("created_at"),
  ]);

  if (!quote) notFound();

  const q = quote as unknown as QuoteData;

  // draft 상태는 공개 접근 불가
  if (q.status === "draft") notFound();

  const { data: site } = await admin
    .from("sites")
    .select("name, address, tenant_id, customers(name)")
    .eq("id", q.site_id)
    .single();

  if (!site) notFound();

  const s = site as unknown as SiteData;

  const { data: tenant } = await admin
    .from("tenants")
    .select("business_name, owner_name, owner_phone")
    .eq("id", s.tenant_id)
    .single();

  const t = tenant as unknown as TenantData | null;
  const quoteItems = (items as unknown as QuoteItem[]) ?? [];

  // 공종별로 그룹핑
  const groups = quoteItems.reduce<Record<string, QuoteItem[]>>((acc, item) => {
    const key = item.trades?.name_ko ?? "기타";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const quoteDate = new Date(q.created_at).toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  });

  // 견적 유효기간 — 작성일로부터 30일 (자재비 변동 대비 업계 관행)
  const validUntilDate = new Date(new Date(q.created_at).getTime() + 30 * 24 * 60 * 60 * 1000);
  const validUntil = validUntilDate.toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  });
  // 서버 컴포넌트(force-dynamic)라 요청 시점 기준 계산이 의도된 동작
  // eslint-disable-next-line react-hooks/purity
  const isExpired = validUntilDate.getTime() < Date.now() && q.status !== "accepted";

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 — 업체 브랜드 */}
      <header className="bg-primary text-primary-foreground px-6 py-8">
        <p className="text-sm font-medium text-primary-foreground/70 mb-1">인테리어 견적서</p>
        <h1 className="text-2xl font-black">{s.name}</h1>
        {s.customers?.name && (
          <p className="text-primary-foreground/80 mt-1">{s.customers.name}님</p>
        )}
        <div className="mt-4 pt-4 border-t border-primary-foreground/20 flex items-center justify-between">
          <div>
            <p className="text-sm text-primary-foreground/70">작성 업체</p>
            <p className="text-base font-bold">{t?.business_name ?? ""}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-primary-foreground/70">견적 일자</p>
            <p className="text-base font-bold">{quoteDate}</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 pb-16 space-y-5">
        {/* 현장 정보 */}
        {s.address && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">시공 장소</p>
            <p className="text-base text-foreground">{s.address}</p>
          </div>
        )}

        {/* 공종별 항목 */}
        <div className="space-y-4">
          {Object.entries(groups).map(([tradeName, tradeItems]) => {
            const tradeTotal = tradeItems.reduce((s, i) => s + i.line_total, 0);
            return (
              <div key={tradeName} className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-muted/60 flex items-center justify-between">
                  <h2 className="text-base font-bold text-foreground">{tradeName}</h2>
                  <p className="text-base font-bold text-foreground">{formatKRW(tradeTotal)}</p>
                </div>
                <div className="divide-y divide-border">
                  {tradeItems.map((item) => (
                    <div key={item.id} className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-foreground">{item.description}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {item.quantity}{item.unit}
                        </p>
                      </div>
                      <p className="text-base font-semibold text-foreground shrink-0">
                        {formatKRW(item.line_total)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 합계 */}
        <div className="bg-primary rounded-2xl p-5 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-foreground/70 mb-1">총 견적 금액</p>
              <p className="text-3xl font-black tabular-nums">{formatKRW(q.total_amount)}</p>
              <p className="text-sm text-primary-foreground/70 mt-1">부가세 별도</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-primary-foreground/70">v{q.version}</p>
            </div>
          </div>
          <p className="text-sm text-primary-foreground/70 mt-3 pt-3 border-t border-primary-foreground/20">
            {isExpired
              ? "유효기간이 지난 견적이에요. 시공사에 새 견적을 요청해주세요."
              : `이 견적은 ${validUntil}까지 유효해요`}
          </p>
        </div>

        {/* 고객 수락 버튼 — confirmed / sent / accepted 상태에서 표시 (기간 만료 시 숨김) */}
        {(q.status === "confirmed" || q.status === "sent" || q.status === "accepted") && !isExpired && (
          <AcceptButton
            quoteId={q.id}
            totalAmount={q.total_amount}
            siteName={s.name}
            isAlreadyAccepted={q.status === "accepted"}
          />
        )}

        {/* 업체 연락처 CTA — 견적을 보다가 바로 전화하는 것이 전환의 핵심 경로 */}
        {t && (
          <div className="bg-muted rounded-2xl p-5 text-center">
            <p className="text-base font-bold text-foreground mb-1">
              궁금한 점이 있으시면 연락해주세요
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {t.business_name} · {t.owner_name}
            </p>
            {t.owner_phone && (
              <a
                href={`tel:${t.owner_phone}`}
                className="flex items-center justify-center gap-2 w-full bg-profit text-white rounded-2xl py-4 text-lg font-bold active:opacity-90"
              >
                📞 {t.owner_name} 대표에게 전화하기
              </a>
            )}
            <p className="text-xs text-muted-foreground/60 mt-4">
              Powered by InteriorOS
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
