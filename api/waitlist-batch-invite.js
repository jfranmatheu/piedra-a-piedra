/**
 * Admin: invita a los N primeros de la waitlist (más antiguos primero).
 * POST { count: number, grantQuota?: number }
 * Authorization: Bearer <admin token>
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
    const appUrl = (
      process.env.APP_URL ||
      process.env.VITE_APP_URL ||
      "http://localhost:5173"
    )
      .trim()
      .replace(/\/$/, "");

    if (!url || !secretKey || !publishableKey) {
      return res.status(500).json({ error: "Faltan env vars Supabase" });
    }

    const authHeader = req.headers.authorization || "";
    const token = String(authHeader).replace(/^Bearer\s+/i, "").trim();
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const userClient = createClient(url, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser(token);
    if (userErr || !user) {
      return res.status(401).json({ error: "Sesión inválida" });
    }

    const admin = createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: caller } = await admin
      .from("profiles")
      .select("id, is_platform_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (!caller?.is_platform_admin) {
      return res.status(403).json({ error: "Solo platform admin" });
    }

    const body = readBody(req);
    const count = Math.min(50, Math.max(1, parseInt(body.count, 10) || 1));
    let grantQuota = body.grantQuota === undefined ? 3 : Number(body.grantQuota);
    if (!Number.isInteger(grantQuota) || grantQuota < 0 || grantQuota > 1000) {
      return res.status(400).json({ error: "grantQuota inválido (0–1000)" });
    }

    const { data: rows, error: listErr } = await admin
      .from("platform_waitlist")
      .select("id, email, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(count);

    if (listErr) return res.status(500).json({ error: listErr.message });
    if (!rows?.length) {
      return res.status(200).json({
        ok: true,
        invited: 0,
        results: [],
        message: "No hay nadie pendiente en la lista de espera",
      });
    }

    const redirectTo = `${appUrl}/join`;
    const results = [];

    for (const row of rows) {
      const email = row.email.toLowerCase();
      try {
        await admin.from("platform_invites").insert({
          email,
          invited_by: caller.id,
          status: "pending",
          grants_quota: grantQuota,
        });

        const { error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
          redirectTo,
          data: { granted_invite_quota: grantQuota },
        });

        if (invErr) {
          // Si ya existe en Auth, marcar waitlist y reportar
          results.push({ email, ok: false, error: invErr.message });
          continue;
        }

        await admin
          .from("platform_waitlist")
          .update({
            status: "invited",
            invited_at: new Date().toISOString(),
            invited_by: caller.id,
          })
          .eq("id", row.id);

        results.push({ email, ok: true });
      } catch (e) {
        results.push({ email, ok: false, error: e.message || String(e) });
      }
    }

    const invited = results.filter((r) => r.ok).length;
    return res.status(200).json({
      ok: true,
      invited,
      requested: count,
      grantQuota,
      results,
    });
  } catch (err) {
    console.error("[waitlist-batch-invite]", err);
    return res.status(500).json({ error: err?.message || "Error batch" });
  }
}
