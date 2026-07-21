/**
 * Vercel Serverless Function — invita un usuario a la plataforma (solo platform admin).
 *
 * Env (Production en Vercel):
 *   VITE_SUPABASE_URL  (o SUPABASE_URL)
 *   VITE_SUPABASE_PUBLISHABLE_KEY  (sb_publishable_...) — validar JWT del caller
 *   SUPABASE_SECRET_KEY            (sb_secret_...) — admin API (solo server)
 *   APP_URL                        (https://tu-app.vercel.app)
 *
 * Fallbacks legacy: VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *
 * POST { email: string }
 * Authorization: Bearer <user_access_token>
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

function missingEnvMessage(url, secretKey, publishableKey) {
  const missing = [];
  if (!url) missing.push("VITE_SUPABASE_URL (o SUPABASE_URL)");
  if (!publishableKey) {
    missing.push("VITE_SUPABASE_PUBLISHABLE_KEY (o ANON legacy)");
  }
  if (!secretKey) missing.push("SUPABASE_SECRET_KEY (o SERVICE_ROLE legacy)");
  return `Faltan variables de entorno en Vercel: ${missing.join(", ")}`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

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
    ).replace(/\/$/, "");

    if (!url || !secretKey || !publishableKey) {
      console.error("[invite-user] missing env", {
        hasUrl: Boolean(url),
        hasSecret: Boolean(secretKey),
        hasPublishable: Boolean(publishableKey),
      });
      return res.status(500).json({
        error: missingEnvMessage(url, secretKey, publishableKey),
      });
    }

    const authHeader = req.headers.authorization || req.headers.Authorization || "";
    const token = String(authHeader).replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return res.status(401).json({ error: "Unauthorized: falta Bearer token" });
    }

    // Validar sesión del caller (JWT de usuario + publishable key)
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
      console.error("[invite-user] getUser failed:", userErr?.message || userErr);
      return res.status(401).json({
        error: userErr?.message || "Sesión inválida o expirada",
      });
    }

    // Admin client (secret) — bypass RLS + Auth Admin API
    const admin = createClient(url, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("is_platform_admin, id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) {
      console.error("[invite-user] profile query:", profileErr.message);
      return res.status(500).json({ error: `Perfil: ${profileErr.message}` });
    }

    if (!profile) {
      return res.status(403).json({
        error: "No hay fila en profiles para tu usuario. Ejecuta el schema SQL y vuelve a crear el usuario.",
      });
    }

    if (!profile.is_platform_admin) {
      return res.status(403).json({
        error: "Solo el admin de plataforma puede invitar",
      });
    }

    const body = readBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Email inválido" });
    }

    // Registro de invitación (no bloquear si ya existe pending)
    const { error: inviteRowErr } = await admin.from("platform_invites").insert({
      email,
      invited_by: profile.id,
      status: "pending",
    });
    if (inviteRowErr) {
      // unique / duplicate no es fatal; otras sí
      const msg = inviteRowErr.message || String(inviteRowErr);
      if (!/duplicate|unique|already/i.test(msg)) {
        console.warn("[invite-user] platform_invites insert:", msg);
      }
    }

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${appUrl}/login`,
    });

    if (error) {
      console.error("[invite-user] inviteUserByEmail:", error.message);
      // Mensajes más claros para errores típicos de Auth
      let message = error.message;
      if (/redirect/i.test(message)) {
        message += ` Añade ${appUrl} en Supabase → Authentication → URL Configuration → Redirect URLs.`;
      }
      if (/signups? not allowed|disabled/i.test(message)) {
        message +=
          " En Auth → Providers → Email: desactiva “Confirm email” solo si bloquea invites, o usa Invite (admin) con email habilitado. “Enable sign ups” puede estar off (correcto para invite-only).";
      }
      if (/rate|limit/i.test(message)) {
        message += " Límite de emails de Supabase; espera un rato o configura SMTP propio.";
      }
      return res.status(400).json({ error: message });
    }

    return res.status(200).json({ ok: true, user: data?.user?.id || null });
  } catch (err) {
    console.error("[invite-user] unhandled:", err);
    const message =
      err?.message ||
      (typeof err === "string" ? err : "Error interno al invitar");
    // Module not found → dependencia no instalada en la función
    if (/Cannot find module|ERR_MODULE_NOT_FOUND/i.test(message)) {
      return res.status(500).json({
        error:
          "Falta @supabase/supabase-js en el deploy de la API. El install de Vercel debe incluir dependencias de la raíz del repo (ver package.json + vercel.json).",
      });
    }
    return res.status(500).json({ error: message });
  }
}
