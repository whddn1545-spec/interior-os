import Link from "next/link";
import { PlusIcon, UploadIcon, ChevronRightIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GradeClassifier } from "./grade-classifier";

const GRADE_LABEL: Record<string, string> = { vip: "VIP", gold: "골드", normal: "일반", dormant: "휴면" };
const GRADE_COLOR: Record<string, string> = {
  vip: "bg-yellow-100 text-yellow-700",
  gold: "bg-amber-100 text-amber-700",
  normal: "bg-gray-100 text-gray-600",
  dormant: "bg-slate-100 text-slate-500",
};

export default async function CustomersPage() {
  const supabase = await createClient();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, phone, grade, source")
    .order("name");

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">고객</h1>
        <div className="flex gap-2">
          <GradeClassifier />
          <Link
            href="/customers/import"
            className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-2.5 rounded-xl text-base font-semibold"
          >
            <UploadIcon size={18} />
            가져오기
          </Link>
          <Link
            href="/customers/new"
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-base font-semibold"
          >
            <PlusIcon size={18} />
            추가
          </Link>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {(["vip", "gold", "normal"] as const).map((grade) => {
          const count = (customers ?? []).filter((c) => (c as unknown as { grade: string }).grade === grade).length;
          return (
            <div key={grade} className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
              <p className="text-2xl font-black text-gray-900">{count}</p>
              <p className="text-sm text-gray-500">{GRADE_LABEL[grade]}</p>
            </div>
          );
        })}
      </div>

      {/* 고객 목록 */}
      {!customers || customers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-xl mb-2">고객이 없어요</p>
          <p className="text-base">위의 "추가" 버튼으로 고객을 등록하세요</p>
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
                  className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-4"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl font-bold text-blue-700 shrink-0">
                    {(cAny.name as string).charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold text-gray-900">{cAny.name as string}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${GRADE_COLOR[grade] ?? ""}`}>
                        {GRADE_LABEL[grade] ?? grade}
                      </span>
                    </div>
                    <p className="text-base text-gray-500">{cAny.phone as string} · 현장 {count}건</p>
                  </div>
                  <ChevronRightIcon size={20} className="text-gray-300 shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
