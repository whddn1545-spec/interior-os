import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, ChevronRightIcon, FileTextIcon, PhoneIcon, MicIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CustomerEditForm } from "./customer-edit-form";
import { CallTranscriber } from "./call-transcriber";
import { getTenantPlan, isPro, PLAN_LIMITS } from "@/lib/plan";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [{ data: customer }, { data: sites }, { data: notes }, plan, { count: monthNoteCount }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).single(),
    supabase
      .from("sites")
      .select("id, name, status, start_date, end_date, quotes(total_amount)")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("consultation_notes")
      .select("id, created_at, summary, requirements, action_items, quote_hints, audio_duration_seconds")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    user ? getTenantPlan(supabase, user) : Promise.resolve("basic" as const),
    supabase
      .from("consultation_notes")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", id)
      .gte("created_at", startOfMonth),
  ]);

  if (!customer) notFound();
  const c = customer as unknown as Record<string, unknown>;

  const GRADE_LABEL: Record<string, string> = { vip: "VIP", gold: "골드", normal: "일반", dormant: "휴면" };
  const STATUS_LABEL: Record<string, string> = {
    lead: "상담중", quoting: "견적중", contracted: "계약완료",
    in_progress: "공사중", done: "완료", canceled: "취소",
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 bg-card/95 backdrop-blur border-b border-border z-10 px-4 py-3 flex items-center gap-3">
        <Link href="/customers" className="p-3 -ml-3 text-muted-foreground">
          <ArrowLeftIcon size={24} />
        </Link>
        <h1 className="text-xl font-bold text-foreground flex-1">{c.name as string}</h1>
        <div className="flex items-center gap-2">
          <a
            href={`tel:${c.phone as string}`}
            className="flex items-center gap-1 bg-profit/12 text-profit px-3 py-2.5 rounded-xl text-base font-semibold shrink-0"
          >
            <PhoneIcon size={16} />
            전화
          </a>
          <CustomerEditForm
            customerId={id}
            initial={{
              name: c.name as string,
              phone: c.phone as string,
              address: (c.address as string | null) ?? "",
              source: (c.source as string | null) ?? "etc",
              memo: (c.memo as string | null) ?? "",
            }}
          />
          <Link
            href={`/quotes/new?customerId=${id}`}
            className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-2.5 rounded-xl text-base font-semibold"
          >
            <FileTextIcon size={16} />
            새 견적
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        {/* 고객 정보 */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-3xl font-bold text-primary">
              {(c.name as string).charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{c.name as string}</h2>
              <p className="text-base text-muted-foreground">{GRADE_LABEL[c.grade as string] ?? ""} 고객</p>
            </div>
          </div>
          <div className="space-y-2 text-base">
            <div className="flex justify-between">
              <span className="text-muted-foreground">연락처</span>
              <a href={`tel:${c.phone as string}`} className="font-medium text-primary">{c.phone as string}</a>
            </div>
            {(c.address as string | null) && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">주소</span>
                <span className="font-medium text-right max-w-[220px]">{c.address as string}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">유입경로</span>
              <span className="font-medium">{({ referral: "소개", online: "온라인", repeat: "재방문", etc: "기타" })[c.source as string] ?? ""}</span>
            </div>
          </div>
        </div>

        {/* 메모 */}
        {(c.memo as string | null) && (
          <div className="bg-card rounded-2xl p-4 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-2">메모</h3>
            <p className="text-base text-muted-foreground whitespace-pre-line">{c.memo as string}</p>
          </div>
        )}

        {/* 통화 상담 기록 */}
        {notes && notes.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MicIcon size={16} className="text-primary" />
              <h3 className="text-xl font-semibold text-foreground">상담 기록</h3>
              <span className="text-base text-muted-foreground">{notes.length}건</span>
            </div>
            <div className="space-y-3">
              {notes.map((note) => {
                const n = note as unknown as Record<string, unknown>;
                const reqs = (n.requirements as string[]) ?? [];
                const acts = (n.action_items as string[]) ?? [];
                return (
                  <div key={n.id as string} className="bg-card border border-border rounded-2xl p-4">
                    <p className="text-xs text-muted-foreground mb-2">
                      {new Date(n.created_at as string).toLocaleDateString("ko-KR", {
                        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                      {(n.audio_duration_seconds as number | null) && (
                        <span> · {Math.round((n.audio_duration_seconds as number) / 60)}분 {(n.audio_duration_seconds as number) % 60}초</span>
                      )}
                    </p>
                    <p className="text-base text-foreground mb-3 leading-relaxed">{n.summary as string}</p>
                    {reqs.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs font-bold text-muted-foreground mb-1.5">요구사항</p>
                        <div className="flex flex-wrap gap-1.5">
                          {reqs.map((r, i) => (
                            <span key={i} className="text-xs bg-muted text-foreground px-2.5 py-1 rounded-full">{r}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {acts.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-muted-foreground mb-1.5">다음 할 일</p>
                        <ul className="space-y-1">
                          {acts.map((a, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-sm text-foreground">
                              <span className="w-4 h-4 rounded-full border border-primary shrink-0 mt-0.5" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI 통화 문서화 */}
        <CallTranscriber
          customerId={id}
          isPro={isPro(plan)}
          monthUsed={monthNoteCount ?? 0}
          monthLimit={PLAN_LIMITS.basic.consultationNotesPerMonth}
        />

        {/* 현장 이력 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-semibold text-foreground">현장 이력</h3>
            <span className="text-base text-muted-foreground">{(sites ?? []).length}건</span>
          </div>

          {!sites || sites.length === 0 ? (
            <div className="bg-card rounded-2xl p-6 text-center text-muted-foreground border border-border">
              <p className="text-lg">아직 현장이 없어요</p>
              <Link href={`/quotes/new?customerId=${id}`} className="mt-2 inline-block text-base text-primary">새 견적 만들기 →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {sites.map((site) => {
                const sAny = site as unknown as Record<string, unknown>;
                const quotes = (sAny.quotes as { total_amount: number }[] | null) ?? [];
                const totalRevenue = quotes.reduce((s, q) => s + q.total_amount, 0);
                return (
                  <Link
                    key={sAny.id as string}
                    href={`/sites/${sAny.id as string}?from=/customers/${id}`}
                    className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-4 active:bg-muted"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-foreground truncate">{sAny.name as string}</p>
                      <p className="text-base text-muted-foreground">
                        {STATUS_LABEL[sAny.status as string] ?? sAny.status as string}
                        {totalRevenue > 0 ? ` · ${totalRevenue.toLocaleString("ko-KR")}원` : ""}
                      </p>
                      <p className="text-sm text-primary mt-0.5">현장 정보 · 견적 · 사진 보기</p>
                    </div>
                    <ChevronRightIcon size={18} className="text-muted-foreground/40 shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
