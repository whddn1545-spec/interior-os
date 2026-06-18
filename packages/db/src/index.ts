import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types.js";

export { type Database } from "./types.js";
export * from "./types.js";

export function createSupabaseClient(supabaseUrl: string, supabaseKey: string) {
  return createClient<Database>(supabaseUrl, supabaseKey);
}
