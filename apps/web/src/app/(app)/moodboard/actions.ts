"use server";

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
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      }),
    });

    if (!response.ok) {
      const err = await response.json() as { error?: { message?: string } };
      return { ok: false, error: err.error?.message ?? "이미지 생성 실패" };
    }

    const data = await response.json() as { data: { url?: string; b64_json?: string }[] };
    const imageUrl = data.data[0]?.url ?? "";

    if (!imageUrl) return { ok: false, error: "이미지 URL을 받지 못했어요" };

    return { ok: true, imageUrl };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
