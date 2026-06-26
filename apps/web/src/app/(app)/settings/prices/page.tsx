import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import { PriceEditor } from "./price-editor";

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
        <Link href="/settings" className="p-2 -ml-2 text-gray-600">
          <ArrowLeftIcon size={24} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex-1">단가표 관리</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6">
        {!hasAnyPrices && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
            <h2 className="text-lg font-bold text-blue-800 mb-2">단가표를 먼저 입력해주세요</h2>
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
          <PriceEditor
            trades={tradesData}
            prices={pricesData}
            showSeedButton={false}
          />
        )}
      </div>
    </div>
  );
}
