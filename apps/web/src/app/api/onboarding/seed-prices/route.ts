import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/get-tenant";
import { SEED_PRICES } from "@interior-os/core/pricing";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });

    const tenantId = await getTenantId(supabase, user);

    const { data: trades } = await supabase.from("trades").select("id, code");
    if (!trades) return NextResponse.json({ error: "공종 목록 조회 실패" }, { status: 500 });

    const tradeByCode = new Map(
      (trades as { id: string; code: string }[]).map((t) => [t.code, t.id])
    );

    const toInsert = Object.entries(SEED_PRICES)
      .filter(([code]) => tradeByCode.has(code))
      .map(([code, s]) => ({
        tenant_id: tenantId,
        trade_id: tradeByCode.get(code)!,
        item_name: s.nameKo,
        material_unit_price: s.materialUnitPrice,
        labor_day_rate: s.laborDayRate,
        default_days_per_unit: s.defaultDaysPerUnit,
        effective_from: new Date().toISOString().split("T")[0],
        is_active: true,
      }));

    const { error } = await supabase.from("trade_prices").insert(toInsert);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, count: toInsert.length });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
