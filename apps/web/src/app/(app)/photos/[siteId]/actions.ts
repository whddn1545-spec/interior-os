"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { tagPhoto } from "@/lib/ai/prompts/vision";

export async function uploadAndTagPhoto(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const file = formData.get("file") as File | null;
  const siteId = formData.get("siteId") as string | null;

  if (!file || !siteId) return { ok: false, error: "파일과 현장 ID가 필요합니다" };

  const tenantId = user.user_metadata?.tenant_id ?? user.id as string;

  const ext = file.name.split(".").pop() ?? "jpg";
  const storagePath = `sites/${siteId}/${Date.now()}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("photos")
    .upload(storagePath, bytes, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) return { ok: false, error: uploadError.message };

  const photoInsert = await supabase
    .from("photos")
    .insert({
      tenant_id: tenantId,
      site_id: siteId,
      storage_path: storagePath,
      taken_at: new Date().toISOString(),
      status: "uploaded" as const,
    })
    .select("id")
    .single();

  if (photoInsert.error) {
    return { ok: false, error: photoInsert.error.message };
  }

  const photoId = photoInsert.data.id as string;

  // AI 태깅 (실패해도 업로드 성공 처리)
  try {
    const { data: { publicUrl } } = supabase.storage.from("photos").getPublicUrl(storagePath);

    const { data: trades } = await supabase.from("trades").select("id, code, name_ko");
    const tradeList = (trades as { id: string; code: string; name_ko: string }[] | null) ?? [];
    const availableTradeCodes = tradeList.map((t) => ({ code: t.code, nameKo: t.name_ko }));
    const tradeByCode = new Map(tradeList.map((t) => [t.code, t.id]));

    const tagResult = await tagPhoto({ imageUrl: publicUrl, availableTradeCodes, tenantId });

    const tradeId = tradeByCode.get(tagResult.tradeCode) ?? null;

    await supabase
      .from("photos")
      .update({
        trade_id: tradeId,
        phase: tagResult.phase,
        quality_score: tagResult.qualityScore,
        ai_tags: {
          tradeCode: tagResult.tradeCode,
          captionHint: tagResult.captionHint,
          confidence: tagResult.confidence,
        },
        status: "auto_tagged" as const,
      })
      .eq("id", photoId);
  } catch {
    // AI 태깅 실패는 무시
  }

  revalidatePath(`/photos/${siteId}`);
  return { ok: true };
}

export async function retagPhoto(
  photoId: string,
  siteId: string,
  updates: { phase?: string; tradeId?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("photos") as any)
    .update({ ...updates, status: "reviewed" })
    .eq("id", photoId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/photos/${siteId}`);
  return { ok: true };
}
