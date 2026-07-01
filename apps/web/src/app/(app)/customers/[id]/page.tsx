import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, ChevronRightIcon, MessageSquareIcon, FileTextIcon, PhoneIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CustomerEditForm } from "./customer-edit-form";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (!customer) notFound();
  const c = customer as unknown as Record<string, unknown>;

  const { data: sites } = await supabase
    .from("sites")
    .select("id, name, status, start_date, end_date, quotes(total_amount)")
    .eq("customer_id", id)
    .order("created_at", { ascending: false });

  const GRADE_LABEL: Record<string, string> = { vip: "VIP", gold: "골드", normal: "일반", dormant: "휴면" };
  const STATUS_LABEL: Record<string, string> = {
    lead: "상담중", quoting: "견적중", contracted: "계약완료",
    in_progress: "공사중", done: "완료", canceled: "취소",
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10 px-4 py-3 flex items-center gap-3">
        <Link href="/customers" className="p-3 -ml-3 text-gray-600">
          <ArrowLeftIcon size={24} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex-1">{c.name as string}</h1>
        <div className="flex items-center gap-2">
          <a
            href={`tel:${c.phone as string}`}
            className="flex items-center gap-1 bg-green-100 text-profit px-3 py-2.5 rounded-xl text-base font-semibold shrink-0"
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
            className="flex items-center gap-1 bg-blue-100 text-primary/90 px-3 py-2.5 rounded-xl text-base font-semibold"
          >
            <FileTextIcon size={16} />
            새 견적
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        {/* 고객 정보 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl font-bold text-primary/90">
              {(c.name as string).charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{c.name as string}</h2>
              <p className="text-base text-gray-500">{GRADE_LABEL[c.grade as string] ?? ""} 고객</p>
            </div>
          </div>
          <div className="space-y-2 text-base">
            <div className="flex justify-between">
              <span className="text-gray-500">연락처</span>
              <a href={`tel:${c.phone as string}`} className="font-medium text-primary">{c.phone as string}</a>
            </div>
            {(c.address as string | null) && (
              <div className="flex justify-between">
                <span className="text-gray-500">주소</span>
                <span className="font-medium text-right max-w-[220px]">{c.address as string}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">유입경로</span>
              <span className="font-medium">{({ referral: "소개", online: "온라인", repeat: "재방문", etc: "기타" })[c.source as string] ?? ""}</span>
            </div>
          </div>
        </div>

        {/* 메모 */}
        {(c.memo as string | null) && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">메모</h3>
            <p className="text-base text-gray-700 whitespace-pre-line">{c.memo as string}</p>
          </div>
        )}

        {/* 현장 이력 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-semibold text-gray-800">현장 이력</h3>
            <span className="text-base text-gray-500">{(sites ?? []).length}건</span>
          </div>

          {!sites || sites.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-gray-400 border border-gray-100">
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
                    className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-4 active:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-gray-900 truncate">{sAny.name as string}</p>
                      <p className="text-base text-gray-500">
                        {STATUS_LABEL[sAny.status as string] ?? sAny.status as string}
                        {totalRevenue > 0 ? ` · ${totalRevenue.toLocaleString("ko-KR")}원` : ""}
                      </p>
                      <p className="text-sm text-primary mt-0.5">현장 정보 · 견적 · 사진 보기</p>
                    </div>
                    <ChevronRightIcon size={18} className="text-gray-300 shrink-0" />
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
