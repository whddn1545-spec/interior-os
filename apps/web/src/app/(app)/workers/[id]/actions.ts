"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateWorker(
  workerId: string,
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const company = formData.get("company") as string | null;
  const memo = formData.get("memo") as string | null;
  const rating = formData.get("rating") ? Number(formData.get("rating")) : null;
  const tradeCodes = (formData.getAll("trade_codes") as string[]).filter(Boolean);

  const { error: updateError } = await supabase
    .from("workers")
    .update({
      name: name.trim(),
      phone: phone.trim(),
      company: company?.trim() || null,
      memo: memo?.trim() || null,
      rating,
    })
    .eq("id", workerId);

  if (updateError) return { ok: false, error: updateError.message };

  // 공종 연결 재설정
  await supabase.from("worker_trades").delete().eq("worker_id", workerId);

  if (tradeCodes.length > 0) {
    const { data: trades } = await supabase
      .from("trades")
      .select("id, code")
      .in("code", tradeCodes);

    if (trades && trades.length > 0) {
      await supabase.from("worker_trades").insert(
        (trades as { id: string }[]).map((t) => ({ worker_id: workerId, trade_id: t.id }))
      );
    }
  }

  revalidatePath(`/workers/${workerId}`);
  revalidatePath("/workers");
  return { ok: true };
}

export async function deactivateWorker(workerId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from("workers")
    .update({ is_active: false })
    .eq("id", workerId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/workers");
  return { ok: true };
}
