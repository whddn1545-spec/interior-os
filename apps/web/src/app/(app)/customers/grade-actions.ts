"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/get-tenant";
import { revalidatePath } from "next/cache";

type CustomerGrade = "vip" | "gold" | "normal" | "dormant";

export interface CustomerGradeResult {
  customerId: string;
  recommendedGrade: CustomerGrade;
  reason: string;
}

export async function aiClassifyGrades(): Promise<{
  ok: boolean;
  results?: CustomerGradeResult[];
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = await getTenantId(supabase, user);

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

  const results = classifyGradesByRules(customerData);
  return { ok: true, results };
}

function classifyGradesByRules(
  customers: { id: string; currentGrade: string; siteCount: number; totalRevenue: number; lastSiteDate: string | null }[]
): CustomerGradeResult[] {
  const now = new Date();
  return customers.map((c) => {
    const lastDate = c.lastSiteDate ? new Date(c.lastSiteDate) : null;
    const yearsSinceLast = lastDate ? (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 365) : Infinity;

    let recommendedGrade: CustomerGrade;
    let reason: string;

    if (yearsSinceLast > 3) {
      recommendedGrade = "dormant";
      reason = "마지막 공사 3년 초과";
    } else if (c.siteCount >= 3 || c.totalRevenue >= 20_000_000) {
      recommendedGrade = "vip";
      reason = `공사 ${c.siteCount}건 / 매출 ${c.totalRevenue.toLocaleString()}원`;
    } else if (c.siteCount >= 2 || c.totalRevenue >= 10_000_000) {
      recommendedGrade = "gold";
      reason = `공사 ${c.siteCount}건 / 매출 ${c.totalRevenue.toLocaleString()}원`;
    } else {
      recommendedGrade = "normal";
      reason = "공사 1건 이하";
    }

    return { customerId: c.id, recommendedGrade, reason };
  });
}

const VALID_GRADES = new Set(["vip", "gold", "normal", "dormant"]);

export async function applyGradeChanges(
  changes: { customerId: string; grade: string }[]
): Promise<{ ok: boolean; error?: string }> {
  if (!changes.length) return { ok: true };

  // 입력 검증: 허용된 등급 값만 통과
  const invalid = changes.find((c) => !VALID_GRADES.has(c.grade));
  if (invalid) return { ok: false, error: `유효하지 않은 등급: ${invalid.grade}` };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  // 그룹별 배치 업데이트 (RLS가 tenant 격리를 보장)
  const gradeGroups = new Map<string, string[]>();
  for (const { customerId, grade } of changes) {
    if (!gradeGroups.has(grade)) gradeGroups.set(grade, []);
    gradeGroups.get(grade)!.push(customerId);
  }

  const results = await Promise.all(
    Array.from(gradeGroups.entries()).map(([grade, ids]) =>
      supabase
        .from("customers")
        .update({ grade: grade as "vip" | "gold" | "normal" | "dormant" })
        .in("id", ids)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) return { ok: false, error: failed.error.message };

  revalidatePath("/customers");
  return { ok: true };
}
