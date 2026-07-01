"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/get-tenant";
import { invokeAI } from "@/lib/ai/gateway";
import { revalidatePath } from "next/cache";

export async function createAsRequest(
  siteId: string,
  input: { title: string; description: string; warrantyType: "repair" | "inspection" | "complaint" }
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = await getTenantId(supabase, user);

  const { error } = await supabase.from("as_requests").insert({
    tenant_id: tenantId,
    site_id: siteId,
    title: input.title.trim(),
    description: input.description.trim() || null,
    warranty_type: input.warrantyType,
    status: "open",
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/sites/${siteId}/warranty`);
  revalidatePath(`/sites/${siteId}`);
  return { ok: true };
}

export async function updateAsStatus(
  requestId: string,
  siteId: string,
  status: "open" | "in_progress" | "closed"
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from("as_requests")
    .update({
      status,
      resolved_at: status === "closed" ? new Date().toISOString() : null,
    })
    .eq("id", requestId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/sites/${siteId}/warranty`);
  revalidatePath(`/sites/${siteId}`);
  return { ok: true };
}

export async function generateInspectionMessage(
  siteId: string,
  customerName: string,
  siteName: string,
  endDate: string | null,
  businessName: string
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const monthsAgo = endDate
    ? Math.floor((Date.now() - new Date(endDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : null;

  try {
    const res = await invokeAI({
      task: "as_inspection_message",
      promptVersion: "v1",
      model: "gpt-4o-mini",
      maxTokens: 200,
      systemPrompt:
        "인테리어 리모델링 회사의 사후 관리 담당자입니다. " +
        "고객에게 보낼 점검 안내 문자를 작성해주세요. " +
        "따뜻하고 전문적으로, 80자 이내로, 광고성 문구 없이 작성하세요.",
      userMessage:
        `업체명: ${businessName}\n` +
        `고객명: ${customerName}님\n` +
        `현장명: ${siteName}\n` +
        (monthsAgo !== null ? `공사 완료 후: 약 ${monthsAgo}개월 경과\n` : "") +
        "\n공사 후 무상 A/S 안내 및 점검 제안 문자를 작성해주세요.",
    });
    return { ok: true, message: res.textContent.trim() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "생성 실패" };
  }
}
