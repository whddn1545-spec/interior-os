import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  CameraIcon,
  FileTextIcon,
  FileSignatureIcon,
  MapPinIcon,
  UserIcon,
  WalletIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatKRW } from "@interior-os/core/pricing";

export const dynamic = "force-dynamic";

const SITE_STATUS_LABEL: Record<string, string> = {
  lead: "상담중",
  quoting: "견적중",
  contracted: "계약완료",
  in_progress: "공사중",
  done: "완료",
  canceled: "취소",
};

const QUOTE_STATUS_LABEL: Record<string, string> = {
  draft: "임시저장",
  confirmed: "확정",
  sent: "발송됨",
  accepted: "계약됨",
  rejected: "거절됨",
};

const CONTRACT_STATUS_LABEL: Record<string, string> = {
  draft: "임시저장",
  confirmed: "확정됨",
  signed: "서명완료",
};

const TABS = [
  { key: "overview", label: "종합" },
  { key: "quotes", label: "견적" },
  { key: "photos", label: "사진" },
  { key: "finance", label: "받을돈" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function formatDateKR(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default async function SiteHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; from?: string }>;
}) {
  const { id } = await params;
  const { tab, from } = await searchParams;
  const activeTab = (TABS.some((t) => t.key === tab) ? tab : "overview") as TabKey;

  const supabase = await createClient();

  const { data: site } = await supabase
    .from("sites")
    .select("id, name, address, status, start_date, end_date, customer_id, customers(id, name, phone)")
    .eq("id", id)
    .single();

  if (!site) notFound();

  const siteAny = site as unknown as {
    id: string;
    name: string;
    address: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    customer_id: string | null;
    customers: { id: string; name: string; phone: string } | null;
  };
  const customer = siteAny.customers;

  // 현장 1건에 묶인 견적·계약·사진수·일정수·결제스케줄을 한 번에 조회 (조회 전용)
  const [
    { data: quotes },
    { data: contract },
    { count: photoCount },
    { count: taskCount },
    { data: payments },
  ] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, version, status, total_amount, created_at")
      .eq("site_id", id)
      .order("version", { ascending: false }),
    supabase
      .from("contracts")
      .select("id, status")
      .eq("site_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("photos").select("id", { count: "exact", head: true }).eq("site_id", id),
    supabase.from("schedule_tasks").select("id", { count: "exact", head: true }).eq("site_id", id),
    supabase
      .from("payment_schedules")
      .select("id, stage_label, amount, due_date, paid_at, paid_amount")
      .eq("site_id", id)
      .order("due_date", { ascending: true }),
  ]);

  const quoteList =
    (quotes as { id: string; version: number; status: string; total_amount: number; created_at: string }[] | null) ?? [];
  const latestQuote = quoteList[0] ?? null;
  const contractAny = contract as { id: string; status: string } | null;
  const photoTotal = photoCount ?? 0;
  const taskTotal = taskCount ?? 0;

  const paymentList =
    (payments as
      | { id: string; stage_label: string; amount: number; due_date: string | null; paid_at: string | null; paid_amount: number | null }[]
      | null) ?? [];
  const outstanding = paymentList
    .filter((p) => !p.paid_at)
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const paidTotal = paymentList
    .filter((p) => p.paid_at)
    .reduce((sum, p) => sum + Number(p.paid_amount ?? p.amount ?? 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* 헤더 */}
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10 px-4 py-3 flex items-center gap-3">
        <Link href={from ?? "/customers"} className="p-3 -ml-3 text-gray-600" aria-label="뒤로 가기">
          <ArrowLeftIcon size={24} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{siteAny.name}</h1>
          <p className="text-base text-gray-500 truncate">
            {customer?.name ? `${customer.name} · ` : ""}
            {SITE_STATUS_LABEL[siteAny.status] ?? siteAny.status}
          </p>
        </div>
      </header>

      {/* 탭 */}
      <nav className="sticky top-[60px] bg-white border-b border-gray-100 z-10 flex gap-1 px-2 overflow-x-auto">
        {TABS.map((t) => {
          const isActive = t.key === activeTab;
          const badge =
            t.key === "quotes"
              ? quoteList.length
              : t.key === "photos"
                ? photoTotal
                : t.key === "finance"
                  ? paymentList.filter((p) => !p.paid_at).length
                  : 0;
          return (
            <Link
              key={t.key}
              href={t.key === "overview" ? `/sites/${id}` : `/sites/${id}?tab=${t.key}`}
              className={`flex min-h-[56px] flex-1 min-w-[72px] items-center justify-center gap-1 px-3 text-base font-bold border-b-2 ${
                isActive ? "border-blue-700 text-blue-700" : "border-transparent text-gray-500"
              }`}
            >
              {t.label}
              {badge > 0 && (
                <span
                  className={`text-sm rounded-full px-1.5 ${
                    isActive ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-4">
        {/* 종합 탭 */}
        {activeTab === "overview" && (
          <>
            {/* 현장 정보 */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-gray-900">현장 정보</h2>
                <span className="text-base font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                  {SITE_STATUS_LABEL[siteAny.status] ?? siteAny.status}
                </span>
              </div>
              <div className="space-y-2 text-base">
                {customer?.name && (
                  <Link
                    href={`/customers/${customer.id}`}
                    className="flex items-center gap-3 -mx-1 px-1 py-2 rounded-xl active:bg-gray-50"
                  >
                    <UserIcon size={20} className="text-gray-400 shrink-0" />
                    <span className="text-gray-500 w-16 shrink-0">고객</span>
                    <span className="flex-1 font-medium text-blue-600 truncate">{customer.name}</span>
                    <ChevronRightIcon size={18} className="text-gray-300 shrink-0" />
                  </Link>
                )}
                {customer?.phone && (
                  <a
                    href={`tel:${customer.phone}`}
                    className="flex items-center gap-3 -mx-1 px-1 py-2 rounded-xl active:bg-gray-50"
                  >
                    <span className="w-5 shrink-0" />
                    <span className="text-gray-500 w-16 shrink-0">연락처</span>
                    <span className="flex-1 font-medium text-blue-600">{customer.phone}</span>
                  </a>
                )}
                {siteAny.address && (
                  <div className="flex items-start gap-3 px-1 py-2">
                    <MapPinIcon size={20} className="text-gray-400 shrink-0 mt-0.5" />
                    <span className="text-gray-500 w-16 shrink-0">주소</span>
                    <span className="flex-1 font-medium text-gray-800">{siteAny.address}</span>
                  </div>
                )}
                {(siteAny.start_date || siteAny.end_date) && (
                  <div className="flex items-start gap-3 px-1 py-2">
                    <CalendarIcon size={20} className="text-gray-400 shrink-0 mt-0.5" />
                    <span className="text-gray-500 w-16 shrink-0">공사기간</span>
                    <span className="flex-1 font-medium text-gray-800">
                      {formatDateKR(siteAny.start_date)} ~ {formatDateKR(siteAny.end_date)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 바로가기 (일정 / 사진) */}
            <div className="grid grid-cols-2 gap-3">
              <Link
                href={`/schedule/${id}`}
                className="flex flex-col items-center justify-center gap-1 bg-white border border-gray-100 rounded-2xl py-5 active:bg-gray-50"
              >
                <CalendarIcon size={26} className="text-green-600" />
                <span className="text-base font-semibold text-gray-800">공사 일정</span>
                <span className="text-sm text-gray-500">
                  {taskTotal > 0 ? `${taskTotal}개 작업` : "일정 만들기"}
                </span>
              </Link>
              <Link
                href={`/photos/${id}?from=/sites/${id}`}
                className="flex flex-col items-center justify-center gap-1 bg-white border border-gray-100 rounded-2xl py-5 active:bg-gray-50"
              >
                <CameraIcon size={26} className="text-purple-600" />
                <span className="text-base font-semibold text-gray-800">현장 사진</span>
                <span className="text-sm text-gray-500">
                  {photoTotal > 0 ? `${photoTotal}장` : "사진 올리기"}
                </span>
              </Link>
            </div>

            {/* 받을 돈 요약 */}
            {paymentList.length > 0 && (
              <Link
                href={`/sites/${id}?tab=finance`}
                className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-gray-100 active:bg-gray-50"
              >
                <WalletIcon size={24} className="text-blue-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-base font-semibold text-gray-900">미수금</p>
                  <p className="text-sm text-gray-500">받을 돈 자세히 보기</p>
                </div>
                <p className="text-lg font-bold text-blue-700 shrink-0">{formatKRW(outstanding)}</p>
                <ChevronRightIcon size={20} className="text-gray-300 shrink-0" />
              </Link>
            )}

            {/* 최신 견적/계약 바로가기 */}
            <Link
              href={
                latestQuote
                  ? `/quotes/${latestQuote.id}?from=/sites/${id}`
                  : customer?.id
                    ? `/quotes/new?customerId=${customer.id}`
                    : "/quotes/new"
              }
              className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-gray-100 active:bg-gray-50"
            >
              <FileTextIcon size={24} className="text-blue-600 shrink-0" />
              <div className="flex-1">
                <p className="text-base font-semibold text-gray-900">
                  {latestQuote ? "최신 견적 보기" : "새 견적 만들기"}
                </p>
                <p className="text-sm text-gray-500">
                  {latestQuote
                    ? `v${latestQuote.version} · ${formatKRW(latestQuote.total_amount)}`
                    : "이 현장 견적이 아직 없어요"}
                </p>
              </div>
              <ChevronRightIcon size={20} className="text-gray-300 shrink-0" />
            </Link>

            {contractAny && (
              <Link
                href={`/contracts/${contractAny.id}?from=/sites/${id}`}
                className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-gray-100 active:bg-gray-50"
              >
                <FileSignatureIcon size={24} className="text-green-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-base font-semibold text-gray-900">계약서 보기</p>
                  <p className="text-sm text-gray-500">
                    {CONTRACT_STATUS_LABEL[contractAny.status] ?? contractAny.status}
                  </p>
                </div>
                <ChevronRightIcon size={20} className="text-gray-300 shrink-0" />
              </Link>
            )}
          </>
        )}

        {/* 견적 탭 */}
        {activeTab === "quotes" && (
          <div className="space-y-2">
            {quoteList.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center text-gray-400 border border-gray-100">
                <p className="text-lg">이 현장 견적이 아직 없어요</p>
                <Link
                  href={customer?.id ? `/quotes/new?customerId=${customer.id}` : "/quotes/new"}
                  className="mt-3 inline-flex min-h-[56px] items-center justify-center rounded-xl bg-blue-700 px-6 text-base font-bold text-white"
                >
                  새 견적 만들기
                </Link>
              </div>
            ) : (
              quoteList.map((q) => (
                <Link
                  key={q.id}
                  href={`/quotes/${q.id}?from=/sites/${id}`}
                  className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-4 active:bg-gray-50"
                >
                  <FileTextIcon size={22} className="text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-gray-900">
                      견적 v{q.version}
                    </p>
                    <p className="text-sm text-gray-500">
                      {QUOTE_STATUS_LABEL[q.status] ?? q.status} · {formatDateKR(q.created_at)}
                    </p>
                  </div>
                  <p className="text-base font-bold text-gray-900 shrink-0">{formatKRW(q.total_amount)}</p>
                  <ChevronRightIcon size={18} className="text-gray-300 shrink-0" />
                </Link>
              ))
            )}
          </div>
        )}

        {/* 사진 탭 */}
        {activeTab === "photos" && (
          <Link
            href={`/photos/${id}?from=/sites/${id}`}
            className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-gray-100 active:bg-gray-50"
          >
            <CameraIcon size={26} className="text-purple-600 shrink-0" />
            <div className="flex-1">
              <p className="text-base font-semibold text-gray-900">
                {photoTotal > 0 ? `사진 ${photoTotal}장 보기` : "사진 올리기"}
              </p>
              <p className="text-sm text-gray-500">현장 사진 관리 화면으로 이동</p>
            </div>
            <ChevronRightIcon size={20} className="text-gray-300 shrink-0" />
          </Link>
        )}

        {/* 받을돈 탭 */}
        {activeTab === "finance" && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="flex justify-between items-baseline">
                <span className="text-base text-gray-500">미수금</span>
                <span className="text-2xl font-black text-blue-700">{formatKRW(outstanding)}</span>
              </div>
              {paidTotal > 0 && (
                <div className="flex justify-between items-baseline mt-2">
                  <span className="text-base text-gray-500">입금완료</span>
                  <span className="text-base font-semibold text-gray-700">{formatKRW(paidTotal)}</span>
                </div>
              )}
            </div>

            {paymentList.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center text-gray-400 border border-gray-100">
                <p className="text-lg">아직 결제 일정이 없어요</p>
                <p className="mt-2 text-base text-gray-500">견적을 확정하면 계약금·중도금·잔금이 자동으로 생겨요</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {paymentList.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-4"
                    >
                      <WalletIcon
                        size={22}
                        className={p.paid_at ? "text-green-600 shrink-0" : "text-blue-600 shrink-0"}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-gray-900">{p.stage_label}</p>
                        <p className="text-sm text-gray-500">
                          {p.paid_at ? "입금완료" : `약정일 ${formatDateKR(p.due_date)}`}
                        </p>
                      </div>
                      <p
                        className={`text-base font-bold shrink-0 ${
                          p.paid_at ? "text-gray-400 line-through" : "text-gray-900"
                        }`}
                      >
                        {formatKRW(p.amount)}
                      </p>
                    </div>
                  ))}
                </div>
                <Link
                  href="/payments"
                  className="flex items-center justify-center min-h-[56px] rounded-2xl bg-gray-100 text-base font-bold text-gray-700 active:bg-gray-200"
                >
                  받을 돈 전체 보기
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
