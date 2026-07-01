import { notFound } from "next/navigation";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { ArrowLeftIcon, PrinterIcon, ShareIcon, SparklesIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { invokeAI } from "@/lib/ai/gateway";
import { formatKRW } from "@interior-os/core/pricing";
import { getTenantPlan, isPro } from "@/lib/plan";

export const dynamic = "force-dynamic";

function formatDateKR(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

async function generateNarrative(data: {
  siteName: string;
  address: string | null;
  customerName: string | null;
  startDate: string | null;
  endDate: string | null;
  trades: string[];
  totalAmount: number;
  totalExpenses: number;
  photoCount: number;
}): Promise<string> {
  try {
    const res = await invokeAI({
      task: "completion_report",
      promptVersion: "v1",
      model: "gpt-4o",
      maxTokens: 512,
      systemPrompt:
        "당신은 인테리어 리모델링 회사의 전문 리포트 작성자입니다. 완공 리포트의 '시공 소감' 섹션을 작성합니다. " +
        "따뜻하고 전문적인 문체로, 고객 입장에서 읽기 좋은 2~3단락을 작성하세요. " +
        "없는 정보는 추측하지 마세요. 리포트 본문만 출력하세요 (제목 없이).",
      userMessage:
        `현장명: ${data.siteName}\n` +
        `주소: ${data.address ?? "—"}\n` +
        `고객: ${data.customerName ?? "—"}\n` +
        `공사기간: ${formatDateKR(data.startDate)} ~ ${formatDateKR(data.endDate)}\n` +
        `시공 공종: ${data.trades.length > 0 ? data.trades.join(", ") : "—"}\n` +
        `계약 금액: ${formatKRW(data.totalAmount)}\n` +
        `사진 촬영: ${data.photoCount}장\n\n` +
        "위 정보를 바탕으로 완공 리포트의 '시공 소감' 섹션(2~3단락)을 작성해주세요.",
    });
    return res.textContent.trim();
  } catch {
    return "";
  }
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: site } = await supabase
    .from("sites")
    .select("id, name, address, status, start_date, end_date, tenant_id, customer_id, customers(id, name, phone)")
    .eq("id", id)
    .single();

  if (!site) notFound();
  const siteAny = site as unknown as {
    id: string; name: string; address: string | null;
    status: string; start_date: string | null; end_date: string | null;
    tenant_id: string; customer_id: string | null;
    customers: { id: string; name: string; phone: string } | null;
  };

  const [
    { data: tenant },
    { data: quotes },
    { data: photos },
    { data: financeEntries },
    plan,
  ] = await Promise.all([
    supabase.from("tenants").select("business_name, owner_name").eq("id", siteAny.tenant_id).single(),
    supabase
      .from("quotes")
      .select("id, total_amount, version, status, quote_items(description, trades(name_ko))")
      .eq("site_id", id)
      .order("version", { ascending: false })
      .limit(1),
    supabase
      .from("photos")
      .select("id, storage_path, phase")
      .eq("site_id", id)
      .order("taken_at", { ascending: true })
      .limit(8),
    supabase
      .from("finance_entries")
      .select("direction, amount")
      .eq("site_id", id),
    user ? getTenantPlan(supabase, user) : Promise.resolve("basic" as const),
  ]);

  const tenantAny = tenant as unknown as { business_name: string; owner_name: string } | null;
  const latestQuote = quotes?.[0] as unknown as {
    id: string; total_amount: number; version: number; status: string;
    quote_items: { description: string; trades: { name_ko: string } | null }[];
  } | null;

  const photoList = (photos as unknown as { id: string; storage_path: string; phase: string | null }[]) ?? [];
  const entries = (financeEntries as unknown as { direction: string; amount: number }[]) ?? [];
  const totalExpenses = entries.filter((e) => e.direction === "out").reduce((s, e) => s + Number(e.amount), 0);
  const totalAmount = latestQuote?.total_amount ?? 0;
  const margin = totalAmount > 0 ? totalAmount - totalExpenses : null;
  const marginRate = totalAmount > 0 ? Math.round(((totalAmount - totalExpenses) / totalAmount) * 100) : null;

  // 공종 목록 (중복 제거)
  const trades = Array.from(new Set(
    (latestQuote?.quote_items ?? [])
      .map((qi) => qi.trades?.name_ko)
      .filter((n): n is string => !!n)
  ));

  // 사진 서명 URL 생성
  const photoUrls: string[] = [];
  for (const photo of photoList.slice(0, 6)) {
    const { data: signed } = await supabase.storage
      .from("photos")
      .createSignedUrl(photo.storage_path, 3600);
    if (signed?.signedUrl) photoUrls.push(signed.signedUrl);
  }

  // AI 완공 소감 — Pro 플랜만 생성
  const proUser = isPro(plan);
  const getCachedNarrative = unstable_cache(
    () => generateNarrative({
      siteName: siteAny.name,
      address: siteAny.address,
      customerName: siteAny.customers?.name ?? null,
      startDate: siteAny.start_date,
      endDate: siteAny.end_date,
      trades,
      totalAmount,
      totalExpenses,
      photoCount: photoList.length,
    }),
    [`report-narrative-${id}`],
    { revalidate: 3600, tags: [`report-${id}`] }
  );
  const narrative = proUser ? await getCachedNarrative() : null;

  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-background print:bg-card">
      {/* 인쇄 시 숨겨지는 헤더 */}
      <header className="sticky top-0 bg-card/95 backdrop-blur border-b border-border z-10 px-4 py-3 flex items-center gap-3 print:hidden">
        <Link href={`/sites/${id}`} className="p-3 -ml-3 text-muted-foreground">
          <ArrowLeftIcon size={24} />
        </Link>
        <h1 className="text-xl font-bold text-foreground flex-1">완공 리포트</h1>
        <button
          onClick={undefined}
          className="flex items-center gap-1.5 bg-muted text-foreground px-4 py-2.5 rounded-xl text-base font-semibold active:bg-accent"
          id="share-btn"
        >
          <ShareIcon size={16} />
          공유
        </button>
        <button
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-base font-semibold active:bg-primary/90"
          onClick={undefined}
          id="print-btn"
        >
          <PrinterIcon size={16} />
          PDF 저장
        </button>
      </header>

      {/* 클라이언트 버튼 동작 */}
      <ReportActions />

      {/* 리포트 본문 */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8 print:py-0 print:px-6 print:space-y-6">

        {/* 1. 헤더 */}
        <div className="text-center border-b-2 border-primary pb-6">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-2">
            {tenantAny?.business_name ?? ""}
          </p>
          <h1 className="text-4xl font-black text-foreground mb-2">완공 리포트</h1>
          <h2 className="text-2xl font-bold text-primary">{siteAny.name}</h2>
          <p className="text-base text-muted-foreground mt-2">발행일 {today}</p>
        </div>

        {/* 2. 현장 기본 정보 */}
        <div className="bg-card rounded-2xl border border-border p-5 print:border-border print:rounded-none print:p-0">
          <h3 className="text-lg font-bold text-foreground mb-4 print:border-b print:border-border print:pb-2">현장 정보</h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-base">
            {siteAny.customers?.name && (
              <>
                <dt className="text-muted-foreground">고객</dt>
                <dd className="font-semibold text-foreground">{siteAny.customers.name}</dd>
              </>
            )}
            {siteAny.address && (
              <>
                <dt className="text-muted-foreground">주소</dt>
                <dd className="font-semibold text-foreground">{siteAny.address}</dd>
              </>
            )}
            {(siteAny.start_date || siteAny.end_date) && (
              <>
                <dt className="text-muted-foreground">공사기간</dt>
                <dd className="font-semibold text-foreground">
                  {formatDateKR(siteAny.start_date)} ~ {formatDateKR(siteAny.end_date)}
                </dd>
              </>
            )}
            {trades.length > 0 && (
              <>
                <dt className="text-muted-foreground">시공 공종</dt>
                <dd className="font-semibold text-foreground">{trades.join(", ")}</dd>
              </>
            )}
          </dl>
        </div>

        {/* 3. 공사비 요약 */}
        {totalAmount > 0 && (
          <div className="bg-card rounded-2xl border border-border p-5 print:border-border print:rounded-none print:p-0">
            <h3 className="text-lg font-bold text-foreground mb-4 print:border-b print:border-border print:pb-2">공사비 내역</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted rounded-xl p-3 text-center print:border print:border-border print:bg-card">
                <p className="text-xs text-muted-foreground mb-1">계약 금액</p>
                <p className="text-lg font-black tabular-nums text-foreground">{formatKRW(totalAmount)}</p>
              </div>
              {totalExpenses > 0 && (
                <div className="bg-muted rounded-xl p-3 text-center print:border print:border-border print:bg-card">
                  <p className="text-xs text-muted-foreground mb-1">실제 지출</p>
                  <p className="text-lg font-black tabular-nums text-foreground">{formatKRW(totalExpenses)}</p>
                </div>
              )}
              {margin !== null && (
                <div className="bg-muted rounded-xl p-3 text-center print:border print:border-border print:bg-card">
                  <p className="text-xs text-muted-foreground mb-1">
                    {margin >= 0 ? "마진" : "초과"}
                  </p>
                  <p className={`text-lg font-black tabular-nums ${margin >= 0 ? "text-profit" : "text-loss"}`}>
                    {margin >= 0 ? "+" : ""}{formatKRW(margin)}
                  </p>
                  {marginRate !== null && (
                    <p className={`text-xs mt-0.5 ${margin >= 0 ? "text-profit" : "text-loss"}`}>
                      {marginRate}%
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. 사진 갤러리 */}
        {photoUrls.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-foreground mb-3 print:border-b print:border-border print:pb-2">
              시공 사진 ({photoUrls.length}장)
            </h3>
            <div className="grid grid-cols-2 gap-2 print:grid-cols-3">
              {photoUrls.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt={`시공 사진 ${i + 1}`}
                  className="w-full aspect-square object-cover rounded-xl print:rounded-none"
                />
              ))}
            </div>
          </div>
        )}

        {/* 5. AI 완공 소감 */}
        {narrative ? (
          <div className="bg-primary/8 rounded-2xl p-5 border border-primary/20 print:border-border print:bg-muted print:rounded-none">
            <h3 className="text-lg font-bold text-primary mb-3 print:text-foreground print:border-b print:border-border print:pb-2">
              시공 소감
            </h3>
            <div className="text-base text-foreground leading-relaxed whitespace-pre-line print:text-foreground">
              {narrative}
            </div>
          </div>
        ) : !proUser && (
          <Link
            href="/pricing"
            className="block bg-primary/8 rounded-2xl p-5 border border-primary/30 text-center print:hidden"
          >
            <SparklesIcon size={24} className="mx-auto mb-2 text-primary" />
            <p className="text-base font-bold text-foreground mb-1">Pro에서 AI 시공 소감 자동 작성</p>
            <p className="text-sm text-muted-foreground mb-3">GPT-4o가 현장 데이터로 완공 소감을 대신 써드려요</p>
            <span className="inline-block bg-primary text-primary-foreground text-sm font-bold px-5 py-2.5 rounded-xl">
              Pro 업그레이드 · ₩39,000/월
            </span>
          </Link>
        )}

        {/* 6. 푸터 */}
        <div className="border-t-2 border-border pt-6 text-center print:border-border">
          <p className="text-base font-bold text-foreground mb-1">
            {tenantAny?.business_name ?? ""} {tenantAny?.owner_name ? `· ${tenantAny.owner_name}` : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            소중한 공사를 맡겨주셔서 감사합니다. 앞으로도 함께 해주세요.
          </p>
        </div>
      </div>
    </div>
  );
}

function ReportActions() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          document.addEventListener('DOMContentLoaded', function() {
            var printBtn = document.getElementById('print-btn');
            if (printBtn) printBtn.addEventListener('click', function() { window.print(); });
            var shareBtn = document.getElementById('share-btn');
            if (shareBtn) shareBtn.addEventListener('click', function() {
              if (navigator.share) {
                navigator.share({ title: document.title, url: location.href });
              } else {
                navigator.clipboard.writeText(location.href).then(function() {
                  shareBtn.textContent = '링크 복사됨!';
                  setTimeout(function() { shareBtn.innerHTML = '<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'16\\' height=\\'16\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><circle cx=\\'18\\' cy=\\'5\\' r=\\'3\\'></circle><circle cx=\\'6\\' cy=\\'12\\' r=\\'3\\'></circle><circle cx=\\'18\\' cy=\\'19\\' r=\\'3\\'></circle><line x1=\\'8.59\\' y1=\\'13.51\\' x2=\\'15.42\\' y2=\\'17.49\\'></line><line x1=\\'15.41\\' y1=\\'6.51\\' x2=\\'8.59\\' y2=\\'10.49\\'></line></svg> 공유'; }, 2000);
                });
              }
            });
          });
        `,
      }}
    />
  );
}
