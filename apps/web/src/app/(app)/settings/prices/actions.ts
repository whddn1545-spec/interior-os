"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/get-tenant";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "../../quotes/new/actions";
import type { ExtractedPriceItem } from "@/lib/ai/claude";

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

/** 사진·문서에서 단가표 AI 추출 */
export async function analyzePriceDocument(
  base64: string,
  mediaType: string
): Promise<ActionResult<{ items: ExtractedPriceItem[] }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  if (!base64 || base64.length < 100) {
    return { ok: false, error: "파일을 읽을 수 없어요" };
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(mediaType)) {
    return { ok: false, error: "JPEG, PNG, WebP 이미지만 지원해요. PDF는 스크린샷으로 찍어 올려주세요. HEIC는 사진 앱 → 내보내기 → JPEG로 변환해주세요." };
  }

  try {
    const { extractPricesFromDocument } = await import("@/lib/ai/claude");
    const result = await extractPricesFromDocument(
      base64,
      mediaType as Parameters<typeof extractPricesFromDocument>[1]
    );

    if (result.parseError) {
      return { ok: false, error: result.parseError };
    }
    if (result.items.length === 0) {
      return { ok: false, error: "단가 항목을 찾을 수 없어요. 더 선명한 사진이나 다른 문서를 올려주세요." };
    }

    return { ok: true, data: { items: result.items } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `분석 중 오류가 발생했어요: ${msg}` };
  }
}

/** AI 추출 결과를 단가표에 일괄 저장 */
export async function bulkSaveExtractedPrices(
  items: Array<{
    tradeId: string;
    itemName: string;
    materialUnitPrice: number;
    laborDayRate: number;
    defaultDaysPerUnit: number;
  }>
): Promise<ActionResult<{ count: number }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = await getTenantId(supabase, user);

  if (!items.length) return { ok: false, error: "저장할 항목이 없어요" };

  const toInsert = items.map((item) => ({
    tenant_id: tenantId,
    trade_id: item.tradeId,
    item_name: item.itemName,
    material_unit_price: item.materialUnitPrice,
    labor_day_rate: item.laborDayRate,
    default_days_per_unit: item.defaultDaysPerUnit,
    effective_from: new Date().toISOString().split("T")[0],
    is_active: true,
  }));

  const { error } = await supabase.from("trade_prices").insert(toInsert);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/prices");
  return { ok: true, data: { count: toInsert.length } };
}
