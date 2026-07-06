import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getTenantId } from "./supabase/get-tenant";

export type Plan = "basic" | "pro" | "team";

export async function getTenantPlan(
  supabase: SupabaseClient,
  user: User
): Promise<Plan> {
  const tenantId = await getTenantId(supabase, user);
  const { data } = await supabase
    .from("tenants")
    .select("plan")
    .eq("id", tenantId)
    .single();
  return ((data as { plan?: string } | null)?.plan as Plan) ?? "basic";
}

export function isPro(plan: Plan): boolean {
  return plan === "pro" || plan === "team";
}

export const PLAN_LIMITS = {
  basic: {
    consultationNotesPerMonth: 3,
    sitesTotal: 20,
  },
} as const;

/**
 * 플랜별 월 AI 비용 상한 (USD).
 * gpt-4o-mini 호출당 약 $0.001, gpt-4o 약 $0.01~0.05 기준으로
 * basic도 일상 사용은 넉넉하고, 폭주(루프·남용)만 차단하는 수준.
 */
export const AI_MONTHLY_COST_CAP_USD: Record<Plan, number> = {
  basic: 2,
  pro: 20,
  team: 50,
};
