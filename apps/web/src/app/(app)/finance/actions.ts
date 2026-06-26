"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/get-tenant";
import { revalidatePath } from "next/cache";
import type { Database, FinanceEntry } from "@interior-os/db/types";

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
  if (!Number.isFinite(amount) || amount < 1) {
    return { ok: false, error: "금액을 1원 이상으로 입력해주세요" };
  }

  // 서버 측 enum 검증 — 잘못된 값이 DB로 흘러가지 않도록 차단
  const directions: FinanceEntry["direction"][] = ["in", "out"];
  const categories: FinanceEntry["category"][] = [
    "customer_payment",
    "material",
    "labor",
    "outsourcing",
    "etc",
  ];
  if (!directions.includes(direction as FinanceEntry["direction"])) {
    return { ok: false, error: "수입/지출 구분이 올바르지 않습니다" };
  }
  if (!categories.includes(category as FinanceEntry["category"])) {
    return { ok: false, error: "분류가 올바르지 않습니다" };
  }

  const todayStr = new Date().toISOString().split("T")[0];
  if (paidAt > todayStr) {
    return { ok: false, error: "미래 날짜는 입력할 수 없어요" };
  }

  // 컬럼명·타입이 finance_entries Insert 타입과 컴파일 타임에 일치 검증됨
  const insertData: Database["public"]["Tables"]["finance_entries"]["Insert"] = {
    tenant_id: tenantId,
    direction: direction as FinanceEntry["direction"],
    category: category as FinanceEntry["category"],
    amount,
    paid_at: paidAt,
    memo: memo || null,
    site_id: siteId || null,
  };

  const { error } = await supabase.from("finance_entries").insert(insertData);

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
