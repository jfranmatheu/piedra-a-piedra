import { createClient } from "@supabase/supabase-js";

/**
 * Vite only embeds env vars present at BUILD time (Vercel/Netlify).
 * Names (new Supabase API keys):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_PUBLISHABLE_KEY  (sb_publishable_...)
 * Legacy fallback:
 *   VITE_SUPABASE_ANON_KEY
 *
 * @see https://supabase.com/docs/guides/getting-started/api-keys
 */
const url = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const publishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ""
).trim();

export const supabaseConfig = {
  url,
  hasUrl: Boolean(url),
  hasPublishableKey: Boolean(publishableKey),
  isConfigured: Boolean(url && publishableKey),
  // which names were seen at build (for diagnostics; never log full secrets)
  keySource: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    ? "VITE_SUPABASE_PUBLISHABLE_KEY"
    : import.meta.env.VITE_SUPABASE_ANON_KEY
      ? "VITE_SUPABASE_ANON_KEY (legacy)"
      : "(missing)",
};

if (!supabaseConfig.isConfigured && import.meta.env.DEV) {
  console.warn(
    "[piedra] Supabase no configurado. Falta VITE_SUPABASE_URL y/o VITE_SUPABASE_PUBLISHABLE_KEY en .env.local o en Vercel (Production + redeploy)."
  );
}

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  publishableKey || "sb_publishable_not_configured",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export function publicAssetUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = supabase.storage.from("project-assets").getPublicUrl(path);
  return data?.publicUrl || null;
}
