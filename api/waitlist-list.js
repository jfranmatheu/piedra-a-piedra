/**
 * Admin: lista waitlist pendiente (más antiguos primero).
 * GET Authorization: Bearer
 */

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const url = (
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      ""
    ).trim();
    const secretKey = (
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      ""
    ).trim();
    const publishableKey = (
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      ""
    ).trim();

    if (!url || !secretKey || !publishableKey) {
      return res.status(500).json({ error: "Faltan env vars" });
    }

    const token = String(req.headers.authorization || "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const userClient = createClient(url, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const {
      data: { user },
    } = await userClient.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "Sesión inválida" });

    const admin = createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: caller } = await admin
      .from("profiles")
      .select("is_platform_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (!caller?.is_platform_admin) {
      return res.status(403).json({ error: "Solo platform admin" });
    }

    const { data: pending, error } = await admin
      .from("platform_waitlist")
      .select("id, email, created_at, status")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) return res.status(500).json({ error: error.message });

    const { count } = await admin
      .from("platform_waitlist")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    return res.status(200).json({
      ok: true,
      pendingCount: count ?? pending?.length ?? 0,
      rows: pending || [],
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Error" });
  }
}
