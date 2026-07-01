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
