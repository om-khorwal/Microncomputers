/**
 * Returns a required setting (environment variable), or stops with a clear
 * message naming the missing one - instead of a vague "supabaseUrl is required".
 *
 * Locally these come from .env / .env.local. On Vercel they must be added in
 * the project: Settings → Environment Variables (then redeploy).
 *
 * The value is passed in (not looked up by name) because Next.js only fills in
 * NEXT_PUBLIC_ settings that are written out in full, e.g.
 * process.env.NEXT_PUBLIC_SUPABASE_URL.
 */
export function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Add it to .env (local) or, on Vercel, ` +
        `under Project → Settings → Environment Variables, then redeploy.`
    );
  }

  return value;
}
