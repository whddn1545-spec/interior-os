"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function signContract(
  contractId: string
): Promise<{ ok: boolean; alreadySigned?: boolean; error?: string }> {
  const admin = createAdminClient();

  const { data: contract, error: fetchErr } = await admin
    .from("contracts")
    .select("status")
    .eq("id", contractId)
    .single();

  if (fetchErr || !contract) return { ok: false, error: "계약서를 찾을 수 없어요" };

  const c = contract as unknown as { status: string };

  if (c.status === "signed") return { ok: true, alreadySigned: true };
  if (c.status === "draft") return { ok: false, error: "아직 확정되지 않은 계약서예요" };

  const { error: updateErr } = await admin
    .from("contracts")
    .update({ status: "signed" })
    .eq("id", contractId);

  if (updateErr) return { ok: false, error: "서명 처리 중 오류가 발생했어요" };

  return { ok: true };
}
