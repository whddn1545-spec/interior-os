"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/get-tenant";
import { revalidatePath } from "next/cache";

export interface ConsultationNote {
  rawTranscript: string;
  summary: string;
  requirements: string[];
  actionItems: string[];
  quoteHints: Record<string, unknown>;
  audioDurationSeconds?: number | null;
}

export async function saveConsultationNote(
  customerId: string,
  note: ConsultationNote
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = await getTenantId(supabase, user);

  const { data, error } = await supabase
    .from("consultation_notes")
    .insert({
      tenant_id: tenantId,
      customer_id: customerId,
      raw_transcript: note.rawTranscript,
      summary: note.summary,
      requirements: note.requirements,
      action_items: note.actionItems,
      quote_hints: note.quoteHints as import("@interior-os/db").Json,
      audio_duration_seconds: note.audioDurationSeconds ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/customers/${customerId}`);
  return { ok: true, id: (data as unknown as { id: string }).id };
}

export async function updateCustomer(
  customerId: string,
  updates: {
    name: string;
    phone: string;
    address: string;
    source: string;
    memo: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from("customers")
    .update({
      name: updates.name.trim(),
      phone: updates.phone.trim(),
      address: updates.address.trim() || null,
      source: updates.source as "referral" | "online" | "repeat" | "etc",
      memo: updates.memo.trim() || null,
    })
    .eq("id", customerId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  return { ok: true };
}
