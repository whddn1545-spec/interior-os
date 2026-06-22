"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/get-tenant";
import { generateInstagramCaption } from "@/lib/ai/prompts/instagram";
import { revalidatePath } from "next/cache";

export async function generateCaption(photoId: string): Promise<{
  ok: boolean;
  caption?: string;
  hashtags?: string[];
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = await getTenantId(supabase, user);

  const { data: photo } = await supabase
    .from("photos")
    .select("id, storage_path, phase, ai_tags, trade_id, site_id, trades(name_ko), sites(name)")
    .eq("id", photoId)
    .single();

  if (!photo) return { ok: false, error: "사진을 찾을 수 없어요" };

  const p = photo as unknown as Record<string, unknown>;
  const aiTags = p.ai_tags as { captionHint?: string } | null;
  const trade = p.trades as { name_ko: string } | null;
  const site = p.sites as { name: string } | null;

  try {
    const result = await generateInstagramCaption({
      tradeNameKo: trade?.name_ko ?? "인테리어",
      phase: p.phase as string ?? "after",
      siteInfo: site?.name ?? "",
      captionHint: aiTags?.captionHint ?? "",
      tenantId,
    });

    return { ok: true, caption: result.caption, hashtags: result.hashtags };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function createInstagramPost(input: {
  photoId: string;
  caption: string;
  hashtags: string[];
}): Promise<{ ok: boolean; postId?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = await getTenantId(supabase, user);

  const { data, error } = await supabase.from("instagram_posts").insert({
    tenant_id: tenantId,
    photo_id: input.photoId,
    photo_ids: [input.photoId],
    caption: input.caption,
    hashtags: input.hashtags,
    status: "draft",
  }).select("id").single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/instagram");
  return { ok: true, postId: data.id as string };
}

export async function confirmInstagramPost(postId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  // draft 상태인 것만 확정 (이미 confirmed/published면 no-op)
  const { error } = await supabase
    .from("instagram_posts")
    .update({ status: "confirmed", confirmed_by: user.id, confirmed_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("status", "draft" as const);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/instagram");
  return { ok: true };
}

export async function publishToInstagram(postId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const igToken = process.env.INSTAGRAM_GRAPH_TOKEN;
  const igAccountId = process.env.INSTAGRAM_ACCOUNT_ID;

  if (!igToken || !igAccountId) {
    return { ok: false, error: "인스타그램 연동이 설정되지 않았어요. 설정 > 인스타그램 연동을 확인하세요." };
  }

  const { data: post } = await supabase
    .from("instagram_posts")
    .select("id, caption, hashtags, status, photo_id, photos(storage_path)")
    .eq("id", postId)
    .single();

  if (!post) return { ok: false, error: "게시물을 찾을 수 없어요" };

  const p = post as unknown as Record<string, unknown>;
  if (p.status === "published") {
    return { ok: false, error: "이미 발행된 게시물입니다" };
  }
  if (p.status !== "confirmed") {
    return { ok: false, error: "먼저 게시물을 확정해야 해요" };
  }

  const photo = p.photos as { storage_path: string } | null;
  if (!photo) return { ok: false, error: "사진을 찾을 수 없어요" };

  const { data: signedData, error: signedError } = await supabase.storage
    .from("photos")
    .createSignedUrl(photo.storage_path, 3600);
  if (signedError || !signedData?.signedUrl) return { ok: false, error: "사진 URL 생성 실패" };
  const photoPublicUrl = signedData.signedUrl;

  const hashtags = (p.hashtags as string[]).join(" ");
  const fullCaption = `${p.caption as string}\n\n${hashtags}`;

  try {
    // Step 1: 미디어 컨테이너 생성
    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: photoPublicUrl,
          caption: fullCaption,
          access_token: igToken,
        }),
      }
    );
    const container = await containerRes.json() as { id?: string; error?: { message: string } };
    if (!container.id) throw new Error(container.error?.message ?? "컨테이너 생성 실패");

    // Step 2: 게시
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: container.id,
          access_token: igToken,
        }),
      }
    );
    const published = await publishRes.json() as { id?: string; error?: { message: string } };
    if (!published.id) throw new Error(published.error?.message ?? "게시 실패");

    await supabase
      .from("instagram_posts")
      .update({ status: "published", ig_media_id: published.id, published_at: new Date().toISOString() })
      .eq("id", postId);

    revalidatePath("/instagram");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
