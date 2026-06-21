"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
