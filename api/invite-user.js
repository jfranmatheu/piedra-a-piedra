/**
 * Vercel Serverless Function — invita un usuario a la plataforma (solo platform admin).
 *
 * Env (nuevas API keys de Supabase):
 *   VITE_SUPABASE_URL o SUPABASE_URL
 *   VITE_SUPABASE_PUBLISHABLE_KEY  (sb_publishable_...) — validar JWT del caller
 *   SUPABASE_SECRET_KEY            (sb_secret_...) — admin API (solo server)
 *   APP_URL
 *
 * Fallbacks legacy (opcional durante migración):
 *   VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *
 * POST { email: string }
 * Authorization: Bearer <user_access_token>
 *
 * @see https://supabase.com/docs/guides/getting-started/api-keys
 */

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  // Secret key (new) or legacy service_role JWT
  const secretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Publishable key (new) or legacy anon JWT — only to validate the caller's user JWT
  const publishableKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;
  const appUrl = process.env.APP_URL || process.env.VITE_APP_URL || "http://localhost:5173";

  if (!url || !secretKey || !publishableKey) {
    return res.status(500).json({
      error:
        "Missing Supabase env vars (need URL + publishable/anon + secret/service_role)",
    });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const userClient = createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) return res.status(401).json({ error: "Invalid session" });

  const admin = createClient(url, secretKey);

  const { data: profile } = await admin
    .from("profiles")
    .select("is_platform_admin, id")
    .eq("id", user.id)
    .single();

  if (!profile?.is_platform_admin) {
    return res.status(403).json({ error: "Solo el admin de plataforma puede invitar" });
  }

  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Email inválido" });
  }

  await admin.from("platform_invites").insert({
    email,
    invited_by: profile.id,
    status: "pending",
  });

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/login`,
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ ok: true, user: data?.user?.id || null });
}
