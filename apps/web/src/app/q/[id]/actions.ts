"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function acceptQuote(
  quoteId: string
): Promise<{ ok: boolean; alreadyAccepted?: boolean; error?: string }> {
  const admin = createAdminClient();

  const { data: quote, error: fetchErr } = await admin
    .from("quotes")
    .select("status")
    .eq("id", quoteId)
    .single();

  if (fetchErr || !quote) return { ok: false, error: "견적을 찾을 수 없어요" };

  const q = quote as unknown as { status: string };

  if (q.status === "accepted") return { ok: true, alreadyAccepted: true };
  if (q.status === "draft") return { ok: false, error: "아직 확정되지 않은 견적이에요" };

  const { error: updateErr } = await admin
    .from("quotes")
    .update({ status: "accepted" })
    .eq("id", quoteId);

  if (updateErr) return { ok: false, error: updateErr.message };
  return { ok: true };
}
