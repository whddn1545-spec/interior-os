"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/get-tenant";
import { revalidatePath } from "next/cache";

export async function upsertDistanceZone(input: {
  id?: string;
  name: string;
  distanceFactor: number;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = await getTenantId(supabase, user);

  const { error } = await supabase
    .from("distance_zones")
    .upsert({
      ...(input.id ? { id: input.id } : {}),
      tenant_id: tenantId,
      name: input.name,
      distance_factor: input.distanceFactor,
    });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/factors");
  return { ok: true };
}
