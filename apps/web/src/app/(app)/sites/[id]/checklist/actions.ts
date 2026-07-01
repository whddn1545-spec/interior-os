"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/get-tenant";
import { revalidatePath } from "next/cache";

export async function toggleChecklistItem(
  siteId: string,
  phaseKey: string,
  done: boolean
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요해요" };

  const tenantId = await getTenantId(supabase, user);

  if (done) {
    const { error } = await supabase
      .from("site_checklist_items")
      .upsert(
        { tenant_id: tenantId, site_id: siteId, phase_key: phaseKey, done_at: new Date().toISOString() },
        { onConflict: "site_id,phase_key" }
      );
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("site_checklist_items")
      .update({ done_at: null })
      .eq("site_id", siteId)
      .eq("phase_key", phaseKey)
      .eq("tenant_id", tenantId);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/sites/${siteId}`);
  return { ok: true };
}
