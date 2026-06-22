import type { SupabaseClient } from "@supabase/supabase-js";

export async function getTenantId(
  supabase: SupabaseClient,
  user: { id: string; user_metadata?: Record<string, unknown> }
): Promise<string> {
  const fromMeta = user.user_metadata?.tenant_id as string | undefined;
  if (fromMeta) return fromMeta;
  const { data } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  return (data?.tenant_id as string | null) ?? user.id;
}
