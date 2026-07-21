/**
 * Público: unirse a la lista de espera de invitaciones.
 * POST { email: string }
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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

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

    if (!url || !secretKey) {
      return res.status(500).json({ error: "Servidor sin configurar" });
    }

    const body = readBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Email no válido" });
    }

    const admin = createClient(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Ya tiene cuenta
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (existing) {
      return res.status(400).json({
        error: "Ese email ya tiene cuenta. Inicia sesión en /login.",
      });
    }

    // Ya en waitlist pending
    const { data: pending } = await admin
      .from("platform_waitlist")
      .select("id, created_at")
      .eq("status", "pending")
      .ilike("email", email)
      .maybeSingle();
    if (pending) {
      return res.status(200).json({
        ok: true,
        already: true,
        message: "Ya estás en la lista. Te avisaremos por email cuando te toque.",
      });
    }

    const { error } = await admin.from("platform_waitlist").insert({
      email,
      status: "pending",
    });
    if (error) {
      if (/duplicate|unique/i.test(error.message || "")) {
        return res.status(200).json({
          ok: true,
          already: true,
          message: "Ya estás en la lista de espera.",
        });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      ok: true,
      message: "¡Apuntado! Te invitaremos por orden de llegada.",
    });
  } catch (err) {
    console.error("[waitlist-join]", err);
    return res.status(500).json({ error: err?.message || "Error" });
  }
}
