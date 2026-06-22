"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/get-tenant";

interface CreateWorkerInput {
  name: string;
  phone: string;
  company?: string;
  tradeCodes: string[];
}

export async function createWorker(
  input: CreateWorkerInput
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = await getTenantId(supabase, user);

  const { data: worker, error: workerError } = await supabase
    .from("workers")
    .insert({
      tenant_id: tenantId,
      name: input.name.trim(),
      phone: input.phone.trim(),
      company: input.company?.trim() || null,
      is_active: true,
    })
    .select("id")
    .single();

  if (workerError) return { ok: false, error: workerError.message };

  if (input.tradeCodes.length > 0) {
    const { data: trades } = await supabase
      .from("trades")
      .select("id, code")
      .in("code", input.tradeCodes);

    if (trades && trades.length > 0) {
      const links = (trades as { id: string; code: string }[]).map((t) => ({
        worker_id: worker.id,
        trade_id: t.id,
      }));
      await supabase.from("worker_trades").insert(links);
    }
  }

  return { ok: true };
}
