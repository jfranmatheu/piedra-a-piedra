/**
 * Vercel Serverless — el invitado rechaza crear cuenta.
 * Borra el usuario de Auth (cascade a profiles) y marca platform_invites como revoked.
 *
 * Solo si el perfil aún no completó el alta (username_setup_done = false).
 *
 * POST (body vacío)
 * Authorization: Bearer <user_access_token del invitado>
 */

import { createClient } from "@supabase/supabase-js";

function env() {
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
  return { url, secretKey, publishableKey };
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
    const { url, secretKey, publishableKey } = env();
    if (!url || !secretKey || !publishableKey) {
      return res.status(500).json({
        error: "Faltan variables de entorno Supabase en el servidor",
      });
    }

    const authHeader = req.headers.authorization || req.headers.Authorization || "";
    const token = String(authHeader).replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

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
      return res.status(401).json({
        error: userErr?.message || "Sesión inválida",
      });
    }

    const admin = createClient(url, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id, email, username_setup_done, is_platform_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) {
      return res.status(500).json({ error: profileErr.message });
    }

    // Solo se puede auto-borrar si aún no completó el alta
    if (profile?.username_setup_done === true) {
      return res.status(403).json({
        error:
          "La cuenta ya está activada. No se puede rechazar la invitación desde aquí.",
      });
    }

    if (profile?.is_platform_admin) {
      return res.status(403).json({
        error: "No se puede eliminar un admin de plataforma con este flujo",
      });
    }

    const email = (user.email || profile?.email || "").toLowerCase();

    if (email) {
      // Marcar invitaciones (pending o accepted provisional) como revoked
      await admin
        .from("platform_invites")
        .update({ status: "revoked" })
        .ilike("email", email)
        .in("status", ["pending", "accepted"]);
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) {
      console.error("[decline-invite] deleteUser:", delErr.message);
      return res.status(500).json({
        error: `No se pudo eliminar la cuenta: ${delErr.message}`,
      });
    }

    return res.status(200).json({ ok: true, deleted: true });
  } catch (err) {
    console.error("[decline-invite]", err);
    return res.status(500).json({
      error: err?.message || "Error al rechazar la invitación",
    });
  }
}
