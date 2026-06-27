"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/get-tenant";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { calcQuote } from "@interior-os/core/pricing";
import type { QuoteItemInput } from "@interior-os/core/pricing";
import type { ActionResult } from "../new/actions";

/** 편집 화면에 보여줄 draft 견적 항목 한 줄 */
export interface EditableQuoteItem {
  /** quote_items.id (저장 시에는 쓰지 않고 화면 식별용) */
  id: string;
  tradeId: string;
  /** 화면 표시용 공종명 (예: "도배") */
  tradeName: string;
  description: string;
  quantity: number;
  unit: string;
  lineTotal: number;
  // 재계산용으로 보관하는 단위 단가 (DB의 파생값에서 역산)
  materialUnitPrice: number;
  laborDayRate: number;
  defaultDaysPerUnit: number;
}

/**
 * 임시저장(draft) 견적의 항목을 편집 화면용으로 조회.
 * DB에는 파생값(material_cost/labor_days/labor_cost)만 있으므로,
 * 수량 변경 시 재계산이 가능하도록 단위 단가를 역산해 함께 돌려준다.
 */
export async function getQuoteForEdit(quoteId: string): Promise<
  ActionResult<{
    status: string;
    distanceFactor: number;
    difficultyFactor: number;
    reserveRate: number;
    contingencyRate: number;
    items: EditableQuoteItem[];
  }>
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("id, status, distance_factor, difficulty_factor, reserve_rate, contingency_rate")
    .eq("id", quoteId)
    .single();

  if (quoteError || !quote) return { ok: false, error: "견적을 찾을 수 없습니다" };
  const q = quote as unknown as {
    status: string;
    distance_factor: number;
    difficulty_factor: number;
    reserve_rate: number;
    contingency_rate: number;
  };
  if (q.status !== "draft")
    return { ok: false, error: "임시저장 견적만 항목을 수정할 수 있습니다" };

  const { data: itemsRaw, error: itemsError } = await supabase
    .from("quote_items")
    .select("id, trade_id, description, quantity, unit, material_cost, labor_days, labor_cost, line_total, trades(name_ko)")
    .eq("quote_id", quoteId)
    .order("created_at");
  if (itemsError) return { ok: false, error: itemsError.message };

  const items: EditableQuoteItem[] = (itemsRaw ?? []).map((row) => {
    const r = row as unknown as {
      id: string;
      trade_id: string;
      description: string;
      quantity: number;
      unit: string;
      material_cost: number;
      labor_days: number;
      labor_cost: number;
      line_total: number;
      trades: { name_ko: string } | null;
    };
    // 파생값에서 단위 단가 역산 (수량 0 등 0 분모는 0으로 안전 처리)
    const materialUnitPrice = r.quantity > 0 ? r.material_cost / r.quantity : 0;
    const laborDayRate = r.labor_days > 0 ? r.labor_cost / r.labor_days : 0;
    const defaultDaysPerUnit = r.quantity > 0 ? r.labor_days / r.quantity : 0;
    return {
      id: r.id,
      tradeId: r.trade_id,
      tradeName: r.trades?.name_ko ?? "",
      description: r.description,
      quantity: r.quantity,
      unit: r.unit,
      lineTotal: r.line_total,
      materialUnitPrice,
      laborDayRate,
      defaultDaysPerUnit,
    };
  });

  return {
    ok: true,
    data: {
      status: q.status,
      distanceFactor: q.distance_factor,
      difficultyFactor: q.difficulty_factor,
      reserveRate: q.reserve_rate,
      contingencyRate: q.contingency_rate,
      items,
    },
  };
}

/** updateQuoteItems 로 넘기는 항목(수량만 조정/삭제 가능) */
export interface QuoteItemEditInput {
  tradeId: string;
  description: string;
  quantity: number;
  unit: string;
  materialUnitPrice: number;
  laborDayRate: number;
  defaultDaysPerUnit: number;
}

/**
 * 임시저장(draft) 견적의 항목을 통째로 교체하고 금액을 재계산.
 * - 확정 견적은 거부 (deleteQuote 와 동일한 draft 이중 검증)
 * - DB 스키마/테이블 변경 없음: 기존 quote_items 삭제 후 재삽입, quotes 헤더 금액만 갱신
 */
export async function updateQuoteItems(
  quoteId: string,
  items: QuoteItemEditInput[]
): Promise<ActionResult<{ total: number }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = await getTenantId(supabase, user);

  // 항목이 최소 1개는 남아야 한다 (빈 견적 방지)
  const cleaned = items.filter((it) => it.quantity > 0);
  if (cleaned.length === 0)
    return { ok: false, error: "최소 한 개 이상의 항목이 필요합니다. 모두 빼려면 견적을 삭제해주세요." };

  // draft 상태 + 계수 스냅샷 조회 (이중 검증)
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("id, status, distance_factor, difficulty_factor, reserve_rate, contingency_rate")
    .eq("id", quoteId)
    .single();

  if (quoteError || !quote) return { ok: false, error: "견적을 찾을 수 없습니다" };
  const q = quote as unknown as {
    status: string;
    distance_factor: number;
    difficulty_factor: number;
    reserve_rate: number;
    contingency_rate: number;
  };
  if (q.status !== "draft")
    return { ok: false, error: "임시저장 견적만 항목을 수정할 수 있습니다" };

  // 기존 계수를 그대로 유지하며 재계산
  const calcItems: QuoteItemInput[] = cleaned.map((it) => ({
    tradeId: it.tradeId,
    description: it.description,
    quantity: it.quantity,
    unit: it.unit,
    price: {
      materialUnitPrice: it.materialUnitPrice,
      laborDayRate: it.laborDayRate,
      defaultDaysPerUnit: it.defaultDaysPerUnit,
    },
  }));

  const result = calcQuote({
    items: calcItems,
    distanceFactor: q.distance_factor,
    difficultyFactor: q.difficulty_factor,
    reserveRate: q.reserve_rate,
    contingencyRate: q.contingency_rate,
  });

  // 기존 항목 삭제
  const { error: deleteError } = await supabase
    .from("quote_items")
    .delete()
    .eq("quote_id", quoteId);
  if (deleteError) return { ok: false, error: deleteError.message };

  // 재계산한 항목 재삽입
  const { error: insertError } = await supabase.from("quote_items").insert(
    result.items.map((item) => ({
      tenant_id: tenantId,
      quote_id: quoteId,
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
  if (insertError) return { ok: false, error: insertError.message };

  // 견적 헤더 금액 갱신 — draft 조건을 다시 걸어 동시성 보호
  const { error: updateError } = await supabase
    .from("quotes")
    .update({
      subtotal: result.subtotal,
      total_amount: result.total,
    })
    .eq("id", quoteId)
    .eq("status", "draft" as const);
  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/quotes");
  return { ok: true, data: { total: result.total } };
}

/** 견적 → 계약서 생성 */
export async function createContractFromQuote(
  quoteId: string,
  input: { specialTerms?: string; depositRate: number; interimRate: number; finalRate: number }
): Promise<ActionResult<{ contractId: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = (user.user_metadata?.tenant_id as string | undefined)
    ?? (await supabase.from("users").select("tenant_id").eq("id", user.id).single()).data?.tenant_id
    ?? user.id;

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, site_id, status, total_amount")
    .eq("id", quoteId)
    .single();

  if (!quote) return { ok: false, error: "견적을 찾을 수 없습니다" };
  if ((quote.status as string) !== "confirmed")
    return { ok: false, error: "확정된 견적만 계약서를 만들 수 있습니다" };

  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({
      tenant_id: tenantId,
      quote_id: quoteId,
      site_id: quote.site_id,
      status: "draft" as const,
      special_terms: input.specialTerms ?? null,
      payment_terms: {
        deposit: input.depositRate,
        interim: input.interimRate,
        final: input.finalRate,
        totalAmount: quote.total_amount,
      },
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/quotes/${quoteId}`);
  return { ok: true, data: { contractId: contract.id } };
}

/** 견적 PDF 생성 요청 (Claude + react-pdf) */
export async function generateQuotePdf(
  quoteId: string,
  audience: "customer" | "internal"
): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  // 견적 + 항목 조회
  const { data: quote } = await supabase
    .from("quotes")
    .select("*, sites(name, address, customers(name)), quote_items(*)")
    .eq("id", quoteId)
    .single();

  if (!quote) return { ok: false, error: "견적을 찾을 수 없습니다" };
  const quoteAny = quote as unknown as Record<string, unknown>;
  const site = quoteAny.sites as { name: string; address: string; customers: { name: string } | null } | null;

  // 현재는 PDF URL placeholder (AI 생성기 연동 후 실제 PDF 반환)
  const pdfColumn = audience === "customer" ? "customer_pdf_url" : "internal_pdf_url";
  const existingUrl = quoteAny[pdfColumn] as string | null;
  if (existingUrl) return { ok: true, data: { url: existingUrl } };

  // PDF 생성 Route Handler 내부 호출 (쿠키 포워딩으로 인증 유지)
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join("; ");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
  const response = await fetch(`${appUrl}/api/pdf/quote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": cookieHeader,
    },
    body: JSON.stringify({ quoteId, audience }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    const errMsg = errText.startsWith("{")
      ? (JSON.parse(errText) as { error?: string }).error ?? "PDF 생성 실패"
      : "PDF 생성에 실패했습니다";
    return { ok: false, error: errMsg };
  }

  const { url } = (await response.json()) as { url: string };
  const pdfUpdate = pdfColumn === "customer_pdf_url"
    ? { customer_pdf_url: url }
    : { internal_pdf_url: url };
  await supabase.from("quotes").update(pdfUpdate).eq("id", quoteId);

  revalidatePath(`/quotes/${quoteId}`);
  return { ok: true, data: { url } };
}

/** 견적 삭제 (임시저장 상태만, 항목까지 함께 삭제) */
export async function deleteQuote(quoteId: string): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  // 서버 측 검증: 임시저장(draft) 상태인지 확인
  const { data: quote, error: fetchError } = await supabase
    .from("quotes")
    .select("id, status")
    .eq("id", quoteId)
    .single();

  if (fetchError || !quote) return { ok: false, error: "견적을 찾을 수 없습니다" };
  if ((quote.status as string) !== "draft")
    return { ok: false, error: "임시저장 견적만 삭제할 수 있습니다" };

  // 항목 먼저 삭제 (FK 정리)
  const { error: itemsError } = await supabase
    .from("quote_items")
    .delete()
    .eq("quote_id", quoteId);
  if (itemsError) return { ok: false, error: itemsError.message };

  // 견적 헤더 삭제 — draft 조건을 다시 걸어 동시성 보호
  const { error: quoteError } = await supabase
    .from("quotes")
    .delete()
    .eq("id", quoteId)
    .eq("status", "draft" as const);
  if (quoteError) return { ok: false, error: quoteError.message };

  revalidatePath("/quotes");
  revalidatePath("/");
  return { ok: true, data: undefined };
}

/** 견적 복제 (기존 항목/금액을 그대로 복사해 새 draft 견적 생성) */
export async function duplicateQuote(
  quoteId: string
): Promise<ActionResult<{ quoteId: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = await getTenantId(supabase, user);

  // 원본 견적 헤더 조회
  const { data: source, error: sourceError } = await supabase
    .from("quotes")
    .select("site_id, subtotal, distance_factor, difficulty_factor, reserve_rate, contingency_rate, total_amount")
    .eq("id", quoteId)
    .single();

  if (sourceError || !source) return { ok: false, error: "복제할 견적을 찾을 수 없습니다" };

  const src = source as unknown as {
    site_id: string;
    subtotal: number;
    distance_factor: number;
    difficulty_factor: number;
    reserve_rate: number;
    contingency_rate: number;
    total_amount: number;
  };

  // 원본 항목 조회
  const { data: sourceItemsRaw, error: itemsFetchError } = await supabase
    .from("quote_items")
    .select("trade_id, description, quantity, unit, material_cost, labor_days, labor_cost, line_total")
    .eq("quote_id", quoteId);
  if (itemsFetchError) return { ok: false, error: itemsFetchError.message };

  const sourceItems = (sourceItemsRaw ?? []) as unknown as {
    trade_id: string;
    description: string;
    quantity: number;
    unit: string;
    material_cost: number;
    labor_days: number;
    labor_cost: number;
    line_total: number;
  }[];

  // 같은 현장의 다음 버전 번호 계산
  const { count } = await supabase
    .from("quotes")
    .select("*", { count: "exact", head: true })
    .eq("site_id", src.site_id);
  const version = (count ?? 0) + 1;

  // 새 견적 헤더(draft) 생성
  const { data: newQuote, error: insertError } = await supabase
    .from("quotes")
    .insert({
      tenant_id: tenantId,
      site_id: src.site_id,
      version,
      status: "draft" as const,
      subtotal: src.subtotal,
      distance_factor: src.distance_factor,
      difficulty_factor: src.difficulty_factor,
      reserve_rate: src.reserve_rate,
      contingency_rate: src.contingency_rate,
      total_amount: src.total_amount,
    })
    .select("id")
    .single();

  if (insertError || !newQuote) return { ok: false, error: insertError?.message ?? "견적 복제에 실패했습니다" };

  // 항목 복사 INSERT
  if (sourceItems.length > 0) {
    const { error: copyError } = await supabase.from("quote_items").insert(
      sourceItems.map((item) => ({
        tenant_id: tenantId,
        quote_id: newQuote.id,
        trade_id: item.trade_id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        material_cost: item.material_cost,
        labor_days: item.labor_days,
        labor_cost: item.labor_cost,
        line_total: item.line_total,
      }))
    );
    if (copyError) {
      // 롤백: 방금 만든 빈 견적 헤더 정리
      await supabase.from("quotes").delete().eq("id", newQuote.id);
      return { ok: false, error: copyError.message };
    }
  }

  revalidatePath("/quotes");
  return { ok: true, data: { quoteId: newQuote.id } };
}

/** 견적 상태 되돌리기 (confirmed → draft) */
export async function revertQuoteToDraft(quoteId: string): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from("quotes")
    .update({ status: "draft" as const, confirmed_by: null, confirmed_at: null, customer_pdf_url: null, internal_pdf_url: null })
    .eq("id", quoteId)
    .eq("status", "confirmed" as const);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/quotes/${quoteId}`);
  return { ok: true, data: undefined };
}
