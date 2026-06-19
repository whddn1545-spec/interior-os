"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "../new/actions";

/** 견적 → 계약서 생성 */
export async function createContractFromQuote(
  quoteId: string,
  input: { specialTerms?: string; depositRate: number; interimRate: number; finalRate: number }
): Promise<ActionResult<{ contractId: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = user.user_metadata.tenant_id ?? user.id;

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

  // PDF 생성 Route Handler 호출
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_APP_URL ?? "" : ""}/api/pdf/quote`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId, audience }),
    }
  );

  if (!response.ok) {
    return { ok: false, error: "PDF 생성에 실패했습니다" };
  }

  const { url } = (await response.json()) as { url: string };
  const pdfUpdate = pdfColumn === "customer_pdf_url"
    ? { customer_pdf_url: url }
    : { internal_pdf_url: url };
  await supabase.from("quotes").update(pdfUpdate).eq("id", quoteId);

  revalidatePath(`/quotes/${quoteId}`);
  return { ok: true, data: { url } };
}

/** 견적 상태 되돌리기 (confirmed → draft) */
export async function revertQuoteToDraft(quoteId: string): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from("quotes")
    .update({ status: "draft" as const, confirmed_by: null, confirmed_at: null })
    .eq("id", quoteId)
    .eq("status", "confirmed" as const);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/quotes/${quoteId}`);
  return { ok: true, data: undefined };
}
