/**
 * Vercel Serverless — asigna cupo de invitaciones a un usuario existente.
 * Solo platform admin.
 *
 * POST { email?: string, username?: string, quota: number }
 * Authorization: Bearer <admin access_token>
 *
 * quota = valor absoluto de platform_invites_remaining (0–1000)
 */

import { createClient } from "@supabase/supabase-js";

function readBody(req) {
  if (req.body == null) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      return {};
    }
  }
  return req.body;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
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
      return res.status(500).json({ error: "Faltan env vars Supabase en el server" });
    }

    const authHeader = req.headers.authorization || req.headers.Authorization || "";
    const token = String(authHeader).replace(/^Bearer\s+/i, "").trim();
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const userClient = createClient(url, publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser(token);
    if (userErr || !user) {
      return res.status(401).json({ error: userErr?.message || "Sesión inválida" });
    }

    const admin = createClient(url, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const { data: caller } = await admin
      .from("profiles")
      .select("is_platform_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!caller?.is_platform_admin) {
      return res.status(403).json({
        error: "Solo el admin de plataforma puede asignar cupos",
      });
    }

    const body = readBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const username = String(body.username || "")
      .trim()
      .toLowerCase()
      .replace(/^@/, "");
    const quota = Number(body.quota);

    if (!email && !username) {
      return res.status(400).json({
        error: "Indica email o username del usuario",
      });
    }
    if (!Number.isInteger(quota) || quota < 0 || quota > 1000) {
      return res.status(400).json({
        error: "quota debe ser un entero entre 0 y 1000",
      });
    }

    let query = admin
      .from("profiles")
      .select("id, email, username, platform_invites_remaining, is_platform_admin");

    if (username) {
      query = query.eq("username", username);
    } else {
      query = query.ilike("email", email);
    }

    const { data: target, error: tErr } = await query.maybeSingle();
    if (tErr) return res.status(500).json({ error: tErr.message });
    if (!target) {
      return res.status(404).json({
        error: username
          ? `Usuario @${username} no encontrado`
          : `No hay usuario con email ${email}`,
      });
    }

    const { data: updated, error: uErr } = await admin
      .from("profiles")
      .update({ platform_invites_remaining: quota })
      .eq("id", target.id)
      .select("id, username, email, platform_invites_remaining")
      .single();

    if (uErr) return res.status(500).json({ error: uErr.message });

    return res.status(200).json({
      ok: true,
      user: updated,
      previousQuota: target.platform_invites_remaining,
    });
  } catch (err) {
    console.error("[set-invite-quota]", err);
    return res.status(500).json({
      error: err?.message || "Error al asignar cupo",
    });
  }
}
