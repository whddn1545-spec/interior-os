"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/get-tenant";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "../../quotes/new/actions";

/** 단가표 항목 수정 */
export async function upsertTradePrice(input: {
  id?: string;
  tradeId: string;
  itemName: string;
  materialUnitPrice: number;
  laborDayRate: number;
  defaultDaysPerUnit: number;
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = await getTenantId(supabase, user);

  // 서버 측 입력값 검증 (오타/이상값 방지)
  if (!input.itemName || input.itemName.trim() === "") {
    return { ok: false, error: "자재명을 입력해주세요" };
  }
  if (
    !Number.isFinite(input.materialUnitPrice) ||
    !Number.isFinite(input.laborDayRate) ||
    !Number.isFinite(input.defaultDaysPerUnit)
  ) {
    return { ok: false, error: "단가와 작업일수는 숫자로 정확히 입력해주세요" };
  }
  if (input.materialUnitPrice < 0 || input.laborDayRate < 0 || input.defaultDaysPerUnit < 0) {
    return { ok: false, error: "0보다 작은 값은 넣을 수 없어요" };
  }
  if (input.materialUnitPrice > 1000000000 || input.laborDayRate > 1000000000) {
    return { ok: false, error: "단가가 너무 큽니다. 0을 더 누르지 않았는지 확인해주세요" };
  }

  const { data, error } = await supabase
    .from("trade_prices")
    .upsert({
      ...(input.id ? { id: input.id } : {}),
      tenant_id: tenantId,
      trade_id: input.tradeId,
      item_name: input.itemName,
      material_unit_price: input.materialUnitPrice,
      labor_day_rate: input.laborDayRate,
      default_days_per_unit: input.defaultDaysPerUnit,
      effective_from: new Date().toISOString().split("T")[0],
      is_active: true,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/prices");
  return { ok: true, data: { id: (data as unknown as { id: string }).id } };
}

/** 단가표 항목 비활성화 */
export async function deactivateTradePrice(id: string): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("trade_prices")
    .update({ is_active: false })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings/prices");
  return { ok: true, data: undefined };
}

/** 시드 단가 일괄 초기화 */
export async function seedDefaultPrices(): Promise<ActionResult<{ count: number }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = await getTenantId(supabase, user);

  // 공종 목록 가져오기
  const { data: trades } = await supabase.from("trades").select("id, code");
  if (!trades) return { ok: false, error: "공종 목록을 가져올 수 없습니다" };

  const { SEED_PRICES } = await import("@interior-os/core/pricing");

  const tradeByCode = new Map(
    (trades as unknown as { id: string; code: string }[]).map((t) => [t.code, t.id])
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
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/prices");
  return { ok: true, data: { count: toInsert.length } };
}
