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
  const ownerPhoneRaw = (formData.get("owner_phone") as string | null)?.trim() ?? "";
  const briefingEnabled = formData.get("briefing_enabled") === "on";

  if (!businessName || !ownerName) {
    return { ok: false, error: "상호와 대표자명을 모두 입력해주세요" };
  }

  // 휴대폰 번호: 숫자만 남겨 10~11자리 검증. 비워두면 브리핑 미수신
  const phoneDigits = ownerPhoneRaw.replace(/\D/g, "");
  if (phoneDigits && (phoneDigits.length < 10 || phoneDigits.length > 11)) {
    return { ok: false, error: "휴대폰 번호를 다시 확인해주세요 (예: 010-1234-5678)" };
  }

  const { error } = await (supabase.from("tenants") as ReturnType<typeof supabase.from>)
    .update({
      business_name: businessName,
      owner_name: ownerName,
      owner_phone: phoneDigits || null,
      briefing_enabled: briefingEnabled,
    })
    .eq("id", tenantId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}
