"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/get-tenant";
import { revalidatePath } from "next/cache";

export async function updateBusinessInfo(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = await getTenantId(supabase, user);
  const businessName = (formData.get("business_name") as string | null)?.trim() ?? "";
  const ownerName = (formData.get("owner_name") as string | null)?.trim() ?? "";

  if (!businessName || !ownerName) {
    return { ok: false, error: "상호와 대표자명을 모두 입력해주세요" };
  }

  const { error } = await (supabase.from("tenants") as ReturnType<typeof supabase.from>)
    .update({ business_name: businessName, owner_name: ownerName })
    .eq("id", tenantId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}
