import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { PriceEditor } from "./price-editor";
import { PriceDocumentUploader } from "./price-document-uploader";

export default async function PricesPage() {
  const supabase = await createClient();

  const { data: trades } = await supabase
    .from("trades")
    .select("id, code, name_ko, unit")
    .order("sort_order");

  const { data: prices } = await supabase
    .from("trade_prices")
    .select("id, trade_id, item_name, material_unit_price, labor_day_rate, default_days_per_unit, is_active")
    .eq("is_active", true)
    .order("trade_id");

  const tradesData = (trades ?? []).map((t) => t as unknown as { id: string; code: string; name_ko: string; unit: string });
  const pricesData = (prices ?? []).map((p) => p as unknown as {
    id: string; trade_id: string; item_name: string;
    material_unit_price: number; labor_day_rate: number; default_days_per_unit: number;
  });

  const hasAnyPrices = pricesData.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 bg-white border-b border-gray-100 z-10 px-4 py-3 flex items-center gap-3">
        <Link href="/settings" className="p-3 -ml-3 text-gray-600">
          <ArrowLeftIcon size={24} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex-1">단가표 관리</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* AI 단가 추출 — 항상 상단에 노출 */}
        <PriceDocumentUploader trades={tradesData} />

        {!hasAnyPrices && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
            <h2 className="text-lg font-bold text-blue-800 mb-2">직접 입력도 할 수 있어요</h2>
            <p className="text-base text-blue-700 mb-4">
              업계 평균 기본값을 불러온 후 내 사업에 맞게 수정하세요.
            </p>
            <PriceEditor
              trades={tradesData}
              prices={pricesData}
              showSeedButton={true}
            />
          </div>
        )}

        {hasAnyPrices && (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
              <h2 className="text-base font-bold text-amber-900 mb-1">
                단가를 바꾸면 이렇게 적용돼요
              </h2>
              <p className="text-base text-amber-800 leading-relaxed">
                여기서 단가를 바꿔도 <span className="font-semibold">이미 만들어 둔 견적서의 금액은 그대로</span>예요.
                바뀐 단가는 <span className="font-semibold">새로 만드는 견적서부터</span> 적용됩니다.
              </p>
            </div>
            <PriceEditor
              trades={tradesData}
              prices={pricesData}
              showSeedButton={false}
            />
          </>
        )}
      </div>
    </div>
  );
}
