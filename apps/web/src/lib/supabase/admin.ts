import { createClient } from "@supabase/supabase-js";
import type { Database } from "@interior-os/db/types";

// service_role 클라이언트: RLS를 우회. 온보딩/결제/크론에서만 사용
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다");
  }

  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  });
}
