"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type SiteStatus = "lead" | "quoting" | "contracted" | "in_progress" | "done" | "canceled";

export async function updateSite(
  siteId: string,
  updates: {
    name: string;
    address: string;
    status: SiteStatus;
    start_date: string | null;
    end_date: string | null;
    area_pyeong: number | null;
  }
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다" };

  const { error } = await supabase
    .from("sites")
    .update({
      name: updates.name.trim(),
      address: updates.address.trim(),
      status: updates.status,
      start_date: updates.start_date || null,
      end_date: updates.end_date || null,
      area_pyeong: updates.area_pyeong,
    })
    .eq("id", siteId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/sites/${siteId}`);
  revalidatePath("/sites");
  revalidatePath("/");
  return { ok: true };
}
