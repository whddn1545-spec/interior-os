"use server";

import { createClient } from "@/lib/supabase/server";

async function saveToStorage(b64: string, prefix: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const tenantId = (user.user_metadata?.tenant_id as string | undefined)
      ?? (await supabase.from("users").select("tenant_id").eq("id", user.id).single()).data?.tenant_id
      ?? user.id;
    const buffer = Buffer.from(b64, "base64");
    const fileName = `${tenantId}/${prefix}/${Date.now()}.png`;
    const { error } = await supabase.storage
      .from("photos")
      .upload(fileName, buffer, { contentType: "image/png", upsert: true });
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from("photos").getPublicUrl(fileName);
    return publicUrl;
  } catch {
    return null;
  }
}

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
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
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

    const url = await saveToStorage(b64, "moodboards");
    return { ok: true, imageUrl: url ?? `data:image/png;base64,${b64}` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function generateVisualization(formData: FormData): Promise<{ ok: boolean; imageUrl?: string; error?: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: "OpenAI API 키가 설정되지 않았어요" };

  const imageFile = formData.get("image") as File | null;
  if (!imageFile || imageFile.size === 0) return { ok: false, error: "사진을 먼저 업로드해주세요" };

  const style = formData.get("style") as string ?? "modern minimalist";
  const colorsRaw = formData.get("colors") as string ?? "[]";
  const colors = JSON.parse(colorsRaw) as string[];
  const spaceType = formData.get("spaceType") as string ?? "room";
  const floor = formData.get("floor") as string ?? "";
  const wall = formData.get("wall") as string ?? "";
  const kitchen = formData.get("kitchen") as string ?? "";
  const bathroom = formData.get("bathroom") as string ?? "";
  const extra = formData.get("extra") as string ?? "";
  const preferences = formData.get("preferences") as string ?? "";

  const materialLines = [
    floor && `바닥재: ${floor}`,
    wall && `벽체/도배: ${wall}`,
    kitchen && `주방/상판: ${kitchen}`,
    bathroom && `욕실 타일: ${bathroom}`,
    extra && `기타 자재: ${extra}`,
  ].filter(Boolean);

  const colorText = colors.length ? colors.join(", ") : "neutral tones";

  const prompt = [
    `Transform this Korean apartment ${spaceType} into a photorealistic completed renovation result.`,
    `Interior style: ${style}.`,
    `Color scheme: ${colorText}.`,
    materialLines.length ? `Materials used — ${materialLines.join("; ")}.` : "",
    preferences ? `Customer requirements: ${preferences}.` : "",
    "Show the finished renovation as a real interior photography photo from the same angle.",
    "The result should look exactly like a completed, professional Korean apartment renovation.",
    "High quality, realistic, no watermarks.",
  ].filter(Boolean).join(" ");

  try {
    const bytes = await imageFile.arrayBuffer();
    const imageBlob = new Blob([bytes], { type: imageFile.type || "image/jpeg" });

    const fd = new FormData();
    // OpenAI images/edits API는 dall-e-2 만 지원합니다
    fd.append("model", "dall-e-2");
    fd.append("image", imageBlob, "before.png"); // PNG 필수이므로 .png로 설정
    fd.append("prompt", prompt);
    fd.append("n", "1");
    fd.append("size", "1024x1024");
    fd.append("response_format", "b64_json");

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fd,
    });

    if (!response.ok) {
      const err = await response.json() as { error?: { message?: string } };
      return { ok: false, error: err.error?.message ?? "이미지 생성 실패" };
    }

    const data = await response.json() as { data: { b64_json?: string }[] };
    const b64 = data.data[0]?.b64_json;
    if (!b64) return { ok: false, error: "이미지를 받지 못했어요" };

    const url = await saveToStorage(b64, "visualizations");
    return { ok: true, imageUrl: url ?? `data:image/png;base64,${b64}` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
