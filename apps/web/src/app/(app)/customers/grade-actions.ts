"use server";

import { createClient } from "@/lib/supabase/server";
import { classifyCustomerGrades, type CustomerGradeResult } from "@/lib/ai/prompts/crm";
import { revalidatePath } from "next/cache";

export async function aiClassifyGrades(): Promise<{
  ok: boolean;
  results?: CustomerGradeResult[];
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = (user.user_metadata?.tenant_id ?? user.id) as string;

  // 고객 + 공사 이력 조회
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, grade, sites(id, status, start_date, quotes(total_amount))")
    .order("name");

  if (!customers || customers.length === 0) return { ok: false, error: "고객이 없어요" };

  const customerData = (customers as unknown as {
    id: string; name: string; grade: string;
    sites: { id: string; status: string; start_date: string | null; quotes: { total_amount: number }[] }[];
  }[]).map((c) => {
    const doneSites = c.sites.filter((s) => ["contracted", "in_progress", "done"].includes(s.status));
    const totalRevenue = doneSites.reduce((sum, s) => sum + s.quotes.reduce((qs, q) => qs + q.total_amount, 0), 0);
    const dates = doneSites.map((s) => s.start_date).filter(Boolean) as string[];
    const lastDate = dates.length > 0 ? dates.sort().reverse()[0] : null;

    return {
      id: c.id,
      name: c.name,
      currentGrade: c.grade,
      siteCount: doneSites.length,
      totalRevenue,
      lastSiteDate: lastDate,
    };
  });

  try {
    const results = await classifyCustomerGrades(customerData, tenantId);
    return { ok: true, results };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function applyGradeChanges(
  changes: { customerId: string; grade: string }[]
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  for (const change of changes) {
    await supabase
      .from("customers")
      .update({ grade: change.grade as "vip" | "gold" | "normal" | "dormant" })
      .eq("id", change.customerId);
  }

  revalidatePath("/customers");
  return { ok: true };
}
