import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Admin client — service-role key, bypasses RLS. Import ONLY from
 * server-only code (Server Actions / route handlers under app/admin).
 * The `server-only` import makes any accidental client-bundle import
 * fail the build instead of leaking this key to the browser.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export default supabaseAdmin;
