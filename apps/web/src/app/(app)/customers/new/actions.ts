"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/supabase/get-tenant";
import { revalidatePath } from "next/cache";

interface CreateCustomerInput {
  name: string;
  phone: string;
  address?: string;
  source: "referral" | "online" | "repeat" | "etc";
  memo?: string;
}

export async function createCustomer(
  input: CreateCustomerInput
): Promise<{ ok: boolean; error?: string; customerId?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const tenantId = await getTenantId(supabase, user);

  const { data, error } = await supabase
    .from("customers")
    .insert({
      tenant_id: tenantId,
      name: input.name.trim(),
      phone: input.phone.trim(),
      address: input.address?.trim() || null,
      source: input.source,
      grade: "normal" as const,
      memo: input.memo?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/customers");
  return { ok: true, customerId: data.id };
}
