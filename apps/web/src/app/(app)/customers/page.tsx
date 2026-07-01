import Link from "next/link";
import { PlusIcon, UploadIcon, ChevronRightIcon, SearchIcon, ArrowLeftIcon, PhoneIcon } from "lucide-react";
import { Fab } from "@/components/fab";
import { createClient } from "@/lib/supabase/server";
import { GradeClassifier } from "./grade-classifier";

const GRADE_LABEL: Record<string, string> = { vip: "VIP", gold: "골드", normal: "일반", dormant: "휴면" };
const GRADE_COLOR: Record<string, string> = {
  vip: "bg-yellow-100 text-yellow-700",
  gold: "bg-amber-100 text-amber-700",
  normal: "bg-muted text-muted-foreground",
  dormant: "bg-slate-100 text-slate-500",
};

const GRADE_FILTERS = [
  { key: "all", label: "전체" },
  { key: "vip", label: "VIP" },
  { key: "gold", label: "골드" },
  { key: "normal", label: "일반" },
  { key: "dormant", label: "휴면" },
] as const;

type GradeFilterKey = (typeof GRADE_FILTERS)[number]["key"];

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; grade?: string }>;
}) {
  const { q: qParam, grade: gradeParam } = await searchParams;
  // 검색어 정규화 (서버측 검증)
  const query = (qParam ?? "").trim().slice(0, 50);
  const activeGrade = (GRADE_FILTERS.some((f) => f.key === gradeParam)
    ? gradeParam
    : "all") as GradeFilterKey;

  const supabase = await createClient();

  let customersQuery = supabase
    .from("customers")
    .select("id, name, phone, grade, source")
    .order("name");

  if (query) {
    // ILIKE 와일드카드 문자 이스케이프 (searchCustomers 액션과 동일)
    const escaped = query.replace(/[%_\\]/g, "\\$&");
    customersQuery = customersQuery.or(`name.ilike.%${escaped}%,phone.ilike.%${escaped}%`);
  }
  if (activeGrade !== "all") {
    customersQuery = customersQuery.eq("grade", activeGrade);
  }

  const { data: customers } = await customersQuery;

  // 통계는 필터와 무관하게 전체 기준으로 표시
  const { data: allGrades } = await supabase.from("customers").select("grade");
  const gradeCount = (grade: string) =>
    (allGrades ?? []).filter((g) => (g as unknown as { grade: string }).grade === grade).length;

  // 각 고객의 현장 수
  const { data: siteCounts } = await supabase
    .from("sites")
    .select("customer_id");

  const countByCustomer = new Map<string, number>();
  for (const s of siteCounts ?? []) {
    const sc = s as unknown as { customer_id: string };
    countByCustomer.set(sc.customer_id, (countByCustomer.get(sc.customer_id) ?? 0) + 1);
  }

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

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[28px] font-black tracking-tight text-foreground">고객</h1>
        <div className="flex gap-2">
          <GradeClassifier />
          <Link
            href="/customers/import"
            className="flex items-center gap-1.5 bg-muted text-foreground px-3 py-2.5 rounded-xl text-base font-semibold"
          >
            <UploadIcon size={18} />
            가져오기
          </Link>
        </div>
      </div>
      <Fab href="/customers/new" label="새 고객" />

      {/* 통계 (전체 기준) */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {(["vip", "gold", "normal"] as const).map((grade) => (
          <div key={grade} className="bg-card rounded-2xl border border-border p-3 text-center">
            <p className="text-2xl font-black text-foreground">{gradeCount(grade)}</p>
            <p className="text-sm text-muted-foreground">{GRADE_LABEL[grade]}</p>
          </div>
        ))}
      </div>

      {/* 이름·전화 검색 */}
      <form action="/customers" method="get" className="mb-3">
        {activeGrade !== "all" && <input type="hidden" name="grade" value={activeGrade} />}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon
              size={22}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none"
            />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="이름 또는 전화번호 검색"
              className="w-full rounded-xl border border-border bg-card py-4 pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-primary px-5 py-4 text-base font-semibold text-white active:bg-primary/90"
          >
            검색
          </button>
        </div>
      </form>

      {query && (
        <Link
          href={activeGrade === "all" ? "/customers" : `/customers?grade=${activeGrade}`}
          className="mb-3 inline-block text-base font-medium text-primary"
        >
          검색 초기화 ✕
        </Link>
      )}

      {/* 등급 필터 탭 */}
      <nav className="mb-6 flex gap-2 overflow-x-auto">
        {GRADE_FILTERS.map((f) => {
          const isActive = f.key === activeGrade;
          const params = new URLSearchParams();
          if (query) params.set("q", query);
          if (f.key !== "all") params.set("grade", f.key);
          const qs = params.toString();
          return (
            <Link
              key={f.key}
              href={qs ? `/customers?${qs}` : "/customers"}
              className={`flex h-14 min-w-[72px] flex-1 items-center justify-center rounded-xl px-4 text-base font-bold transition-colors ${
                isActive
                  ? "bg-primary/90 text-white"
                  : "bg-muted text-foreground/90 active:bg-muted"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {/* 고객 목록 */}
      {!customers || customers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground/70">
          <p className="text-xl mb-2">
            {query || activeGrade !== "all" ? "조건에 맞는 고객이 없어요" : "고객이 없어요"}
          </p>
          <p className="text-base mb-6">
            {query || activeGrade !== "all"
              ? "검색어나 필터를 바꿔보세요"
              : "새 고객을 등록해보세요"}
          </p>
          {!query && activeGrade === "all" && (
            <Link
              href="/customers/new"
              className="inline-flex items-center gap-2 bg-primary text-white rounded-2xl px-8 py-4 text-lg font-bold active:bg-primary/90"
            >
              <PlusIcon size={20} />
              고객 추가하기
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {customers.map((c) => {
            const cAny = c as unknown as Record<string, unknown>;
            const grade = cAny.grade as string;
            const count = countByCustomer.get(cAny.id as string) ?? 0;
            return (
              <li key={cAny.id as string}>
                <Link
                  href={`/customers/${cAny.id as string}`}
                  className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-4 active:bg-muted"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl font-bold text-primary/90 shrink-0">
                    {(cAny.name as string).charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold text-foreground">{cAny.name as string}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${GRADE_COLOR[grade] ?? ""}`}>
                        {GRADE_LABEL[grade] ?? grade}
                      </span>
                    </div>
                    <p className="text-base text-muted-foreground">{cAny.phone as string} · 현장 {count}건</p>
                  </div>
                  <a
                    href={`tel:${cAny.phone as string}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 bg-green-100 text-profit px-3 py-2.5 rounded-xl text-base font-semibold shrink-0"
                  >
                    <PhoneIcon size={16} />
                    전화
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
