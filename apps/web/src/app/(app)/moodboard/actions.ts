"use server";

import { createClient } from "@/lib/supabase/server";

export async function generateMoodboard(input: {
  spaceType: string;
  style: string;
  colors: string[];
  area: string;
}): Promise<{ ok: boolean; imageUrl?: string; error?: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: "OpenAI API 키가 설정되지 않았어요" };

  const colorText = input.colors.join(", ");
  const prompt = `A professional interior design moodboard for a ${input.spaceType} in ${input.style} style. Color palette: ${colorText}. Space size: ${input.area}. High-end photography, clean and modern presentation, realistic interior render. Korean apartment interior.`;

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-2",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "medium",
        response_format: "b64_json",
      }),
    });

    if (!response.ok) {
      const err = await response.json() as { error?: { message?: string } };
      return { ok: false, error: err.error?.message ?? "이미지 생성 실패" };
    }

    const data = await response.json() as { data: { b64_json?: string }[] };
    const b64 = data.data[0]?.b64_json;
    if (!b64) return { ok: false, error: "이미지를 받지 못했어요" };

    // Supabase Storage에 업로드해서 영구 URL 확보 (tenant prefix 포함)
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const tenantId = (user.user_metadata?.tenant_id as string | undefined)
          ?? (await supabase.from("users").select("tenant_id").eq("id", user.id).single()).data?.tenant_id
          ?? user.id;
        const buffer = Buffer.from(b64, "base64");
        const fileName = `${tenantId}/moodboards/${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(fileName, buffer, { contentType: "image/png", upsert: true });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from("photos").getPublicUrl(fileName);
          return { ok: true, imageUrl: publicUrl };
        }
      }
    } catch {
      // Storage 실패 시 data URL로 fallback
    }

    return { ok: true, imageUrl: `data:image/png;base64,${b64}` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
