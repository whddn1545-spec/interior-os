import { createClient } from "@/lib/supabase/server";
import { FactorsEditor } from "./factors-editor";

export default async function FactorsPage() {
  const supabase = await createClient();

  const { data: zones } = await supabase
    .from("distance_zones")
    .select("id, name, distance_factor")
    .order("distance_factor", { ascending: true });

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">거리·난이도 계수</h1>
      <p className="text-sm text-gray-500 mb-6">
        견적 금액에 곱해지는 계수예요. 현장 상황에 맞게 조정하세요.
      </p>

      <FactorsEditor zones={(zones as unknown as { id: string; name: string; distance_factor: number }[]) ?? []} />
    </div>
  );
}
