"use server";

import { createClient } from "@/lib/supabase/server";
import { calcQuote } from "@interior-os/core/pricing";
import { revalidatePath } from "next/cache";
import type { QuoteItemInput } from "@interior-os/core/pricing";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** 고객 검색 */
export async function searchCustomers(query: string): Promise<ActionResult<{ id: string; name: string; phone: string }[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, phone")
    .ilike("name", `%${query}%`)
    .limit(10);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data ?? [] };
}

/** 고객 생성 */
export async function createCustomer(input: {
  name: string;
  phone: string;
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  // tenant_id는 JWT claim에서 가져옴 (RLS가 처리)
  const { data, error } = await supabase
    .from("customers")
    .insert({
      name: input.name.trim(),
      phone: input.phone.trim(),
      tenant_id: user.user_metadata.tenant_id ?? user.id,
      grade: "normal" as const,
      source: "etc" as const,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: data.id } };
}

/** 현장 생성 */
export async function createSite(input: {
  customerId: string;
  name: string;
  address: string;
  areaPyeong: number;
  difficulty: "easy" | "normal" | "hard";
  distanceZoneId?: string;
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const { data, error } = await supabase
    .from("sites")
    .insert({
      tenant_id: user.user_metadata.tenant_id ?? user.id,
      customer_id: input.customerId,
      name: input.name.trim(),
      address: input.address.trim(),
      area_pyeong: input.areaPyeong,
      difficulty: input.difficulty,
      distance_zone_id: input.distanceZoneId ?? null,
      status: "quoting",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: data.id } };
}

/** 단가표 조회 */
export async function getTradePrices(): Promise<ActionResult<{
  tradeId: string;
  tradeCode: string;
  nameKo: string;
  itemName: string;
  materialUnitPrice: number;
  laborDayRate: number;
  defaultDaysPerUnit: number;
  unit: string;
}[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trade_prices")
    .select("trade_id, item_name, material_unit_price, labor_day_rate, default_days_per_unit, trades(code, name_ko, unit)")
    .eq("is_active", true)
    .order("item_name");

  if (error) return { ok: false, error: error.message };

  const prices = (data ?? []).map((row) => {
    const trade = row.trades as unknown as { code: string; name_ko: string; unit: string } | null;
    return {
      tradeId: row.trade_id,
      tradeCode: trade?.code ?? "",
      nameKo: trade?.name_ko ?? "",
      itemName: row.item_name,
      materialUnitPrice: row.material_unit_price,
      laborDayRate: row.labor_day_rate,
      defaultDaysPerUnit: row.default_days_per_unit,
      unit: trade?.unit ?? "",
    };
  });

  return { ok: true, data: prices };
}

/** 거리 구역 목록 조회 */
export async function getDistanceZones(): Promise<ActionResult<{
  id: string;
  name: string;
  distanceFactor: number;
}[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("distance_zones")
    .select("id, name, distance_factor")
    .order("distance_factor");

  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    data: (data ?? []).map((z) => ({
      id: z.id,
      name: z.name,
      distanceFactor: z.distance_factor,
    })),
  };
}

export interface QuoteItemDraft {
  tradeId: string;
  description: string;
  quantity: number;
  unit: string;
  materialUnitPrice: number;
  laborDayRate: number;
  defaultDaysPerUnit: number;
  overrideLaborDays?: number;
}

/** 견적 계산 + 저장 (draft 상태) */
export async function saveQuoteDraft(input: {
  siteId: string;
  items: QuoteItemDraft[];
  distanceFactor: number;
  difficultyFactor: number;
  reserveRate?: number;
  contingencyRate?: number;
}): Promise<ActionResult<{ quoteId: string; total: number }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = user.user_metadata.tenant_id ?? user.id;

  // 계산은 @core/pricing 순수 함수가 담당
  const calcItems: QuoteItemInput[] = input.items.map((item) => ({
    tradeId: item.tradeId,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    price: {
      materialUnitPrice: item.materialUnitPrice,
      laborDayRate: item.laborDayRate,
      defaultDaysPerUnit: item.defaultDaysPerUnit,
    },
    overrideLaborDays: item.overrideLaborDays,
  }));

  const result = calcQuote({
    items: calcItems,
    distanceFactor: input.distanceFactor,
    difficultyFactor: input.difficultyFactor,
    reserveRate: input.reserveRate,
    contingencyRate: input.contingencyRate,
  });

  // 버전 번호 계산 (재견적 지원)
  const { count } = await supabase
    .from("quotes")
    .select("*", { count: "exact", head: true })
    .eq("site_id", input.siteId);
  const version = (count ?? 0) + 1;

  // 견적 헤더 저장
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .insert({
      tenant_id: tenantId,
      site_id: input.siteId,
      version,
      status: "draft",
      subtotal: result.subtotal,
      distance_factor: result.snapshot.distanceFactor,
      difficulty_factor: result.snapshot.difficultyFactor,
      reserve_rate: result.snapshot.reserveRate,
      contingency_rate: result.snapshot.contingencyRate,
      total_amount: result.total,
    })
    .select("id")
    .single();

  if (quoteError) return { ok: false, error: quoteError.message };

  // 견적 항목 저장
  const { error: itemsError } = await supabase.from("quote_items").insert(
    result.items.map((item) => ({
      tenant_id: tenantId,
      quote_id: quote.id,
      trade_id: item.tradeId,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      material_cost: item.materialCost,
      labor_days: item.laborDays,
      labor_cost: item.laborCost,
      line_total: item.lineTotal,
    }))
  );

  if (itemsError) return { ok: false, error: itemsError.message };

  return { ok: true, data: { quoteId: quote.id, total: result.total } };
}

/** 견적 확정 (Human-in-the-loop gate) */
export async function confirmQuote(quoteId: string): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from("quotes")
    .update({
      status: "confirmed",
      confirmed_by: user.id,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", quoteId)
    .eq("status", "draft"); // draft 상태인 것만 확정 가능

  if (error) return { ok: false, error: error.message };

  revalidatePath("/quotes");
  revalidatePath("/");
  return { ok: true, data: undefined };
}
