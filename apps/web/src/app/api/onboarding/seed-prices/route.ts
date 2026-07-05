import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantId } from "@/lib/supabase/get-tenant";
import { SEED_PRICES } from "@interior-os/core/pricing";

// 기본 단가 시드 — service_role로 실행한다.
// 온보딩 직후에는 세션 JWT에 tenant_id claim이 아직 없어서(재발급 전)
// 사용자 세션으로는 RLS가 select/insert를 모두 막기 때문.

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });

    const tenantId = await getTenantId(supabase, user);
    const admin = createAdminClient();

    // 이미 단가가 있으면 중복 시드 방지 (온보딩 재진입/복구 버튼 재클릭 대비)
    const { count: existing } = await admin
      .from("trade_prices")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("is_active", true);
    if ((existing ?? 0) > 0) {
      return NextResponse.json({ ok: true, count: 0, skipped: "이미 단가표가 있어요" });
    }

    // 시스템 기본 공종(tenant_id null) + 테넌트 자체 공종
    const { data: trades } = await admin
      .from("trades")
      .select("id, code, tenant_id")
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
    if (!trades) return NextResponse.json({ error: "공종 목록 조회 실패" }, { status: 500 });

    // 같은 code가 시스템/테넌트 양쪽에 있으면 테넌트 것 우선
    const tradeByCode = new Map<string, string>();
    for (const t of trades as { id: string; code: string; tenant_id: string | null }[]) {
      if (t.tenant_id === tenantId || !tradeByCode.has(t.code)) {
        tradeByCode.set(t.code, t.id);
      }
    }

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

    const { error } = await admin.from("trade_prices").insert(toInsert);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, count: toInsert.length });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
