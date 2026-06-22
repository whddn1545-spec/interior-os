"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/get-tenant";
import { revalidatePath } from "next/cache";

export async function addFinanceEntry(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = await getTenantId(supabase, user);
  const direction = formData.get("direction") as string;
  const category = formData.get("category") as string;
  const amount = Number(formData.get("amount"));
  const paidAt = formData.get("paid_at") as string;
  const memo = formData.get("memo") as string | null;
  const siteId = formData.get("site_id") as string | null;

  if (!direction || !category || !amount || !paidAt) {
    return { ok: false, error: "필수 항목을 모두 입력해주세요" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("finance_entries") as any).insert({
    tenant_id: tenantId,
    site_id: siteId || null,
    direction,
    category,
    amount,
    paid_at: paidAt,
    memo: memo || null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/finance");
  return { ok: true };
}

export async function deleteFinanceEntry(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const { error } = await supabase.from("finance_entries").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/finance");
  return { ok: true };
}
