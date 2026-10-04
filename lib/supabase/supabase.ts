import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/supabase/env";

/**
 * Public client — anon key only. RLS restricts this to reading
 * non-archived products. Safe to use from Server Components and,
 * if ever needed, the browser.
 */
export const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
);

export default supabase;
