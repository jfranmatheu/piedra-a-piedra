/**
 * Vercel Serverless — invita un usuario a la plataforma.
 *
 * Quién puede invitar:
 *   - Platform admin: ilimitado; puede elegir grantQuota (default 3)
 *   - Usuario con platform_invites_remaining > 0: consume 1; grantQuota fijo = 3
 *
 * POST { email: string, grantQuota?: number }
 * Authorization: Bearer <user_access_token>
 */

import { createClient } from "@supabase/supabase-js";

const DEFAULT_GRANT_QUOTA = 3;
const MAX_GRANT_QUOTA = 1000;

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

function parseGrantQuota(raw, isAdmin) {
  if (!isAdmin) return DEFAULT_GRANT_QUOTA;
  if (raw === undefined || raw === null || raw === "") return DEFAULT_GRANT_QUOTA;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > MAX_GRANT_QUOTA || !Number.isInteger(n)) {
    throw new Error(
      `grantQuota debe ser un entero entre 0 y ${MAX_GRANT_QUOTA} (default ${DEFAULT_GRANT_QUOTA})`
    );
  }
  return n;
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
    )
      .trim()
      .replace(/\/$/, "");

    try {
      const host = new URL(
        appUrl.includes("://") ? appUrl : `https://${appUrl}`
      ).hostname;
      if (/-projects\.vercel\.app$/i.test(host)) {
        console.warn(
          "[invite-user] APP_URL parece un deploy de equipo/preview protegido:",
          appUrl
        );
      }
    } catch {
      /* ignore */
    }

    if (!url || !secretKey || !publishableKey) {
      return res.status(500).json({
        error: missingEnvMessage(url, secretKey, publishableKey),
      });
    }

    const authHeader = req.headers.authorization || req.headers.Authorization || "";
    const token = String(authHeader).replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return res.status(401).json({ error: "Unauthorized: falta Bearer token" });
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
        error: userErr?.message || "Sesión inválida o expirada",
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
      .select("is_platform_admin, id, platform_invites_remaining, username")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) {
      return res.status(500).json({ error: `Perfil: ${profileErr.message}` });
    }
    if (!profile) {
      return res.status(403).json({
        error: "No hay fila en profiles para tu usuario.",
      });
    }

    const isAdmin = !!profile.is_platform_admin;
    const remaining = profile.platform_invites_remaining ?? 0;

    if (!isAdmin && remaining <= 0) {
      return res.status(403).json({
        error:
          "No te quedan invitaciones a la plataforma. Pide al admin que te asigne cupo.",
      });
    }

    const body = readBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Email inválido" });
    }

    let grantQuota;
    try {
      grantQuota = parseGrantQuota(body.grantQuota, isAdmin);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    // No invitar si ya es usuario de la plataforma
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id, username")
      .ilike("email", email)
      .maybeSingle();
    if (existingProfile) {
      return res.status(400).json({
        error: `Ese email ya tiene cuenta (@${existingProfile.username}). Usa «Asignar cupo» si quieres darle invitaciones.`,
      });
    }

    const { error: inviteRowErr } = await admin.from("platform_invites").insert({
      email,
      invited_by: profile.id,
      status: "pending",
      grants_quota: grantQuota,
    });
    if (inviteRowErr) {
      const msg = inviteRowErr.message || String(inviteRowErr);
      if (!/duplicate|unique|already/i.test(msg)) {
        console.warn("[invite-user] platform_invites insert:", msg);
      }
    } else {
      // Si re-invita con pending previo, actualizar grants_quota
      await admin
        .from("platform_invites")
        .update({ grants_quota: grantQuota, invited_by: profile.id })
        .eq("status", "pending")
        .ilike("email", email);
    }

    const redirectTo = `${appUrl}/join`;
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { granted_invite_quota: grantQuota },
    });

    if (error) {
      console.error("[invite-user] inviteUserByEmail:", error.message);
      let message = error.message;
      if (/redirect/i.test(message)) {
        message += ` Añade ${redirectTo} en Supabase Redirect URLs.`;
      }
      if (/already|registered|exists/i.test(message)) {
        message =
          "Ese email ya está registrado en Auth. Si es un usuario a medias, bórralo en Authentication o asígnale cupo si ya está en la plataforma.";
      }
      return res.status(400).json({ error: message });
    }

    // Consumir 1 invitación (no admin)
    let newRemaining = remaining;
    if (!isAdmin) {
      newRemaining = Math.max(0, remaining - 1);
      const { error: decErr } = await admin
        .from("profiles")
        .update({ platform_invites_remaining: newRemaining })
        .eq("id", profile.id);
      if (decErr) {
        console.error("[invite-user] decrement quota:", decErr.message);
      }
    }

    return res.status(200).json({
      ok: true,
      user: data?.user?.id || null,
      grantQuota,
      invitesRemaining: isAdmin ? null : newRemaining,
      unlimited: isAdmin,
    });
  } catch (err) {
    console.error("[invite-user] unhandled:", err);
    const message =
      err?.message ||
      (typeof err === "string" ? err : "Error interno al invitar");
    if (/Cannot find module|ERR_MODULE_NOT_FOUND/i.test(message)) {
      return res.status(500).json({
        error:
          "Falta @supabase/supabase-js en el deploy de la API (package.json raíz).",
      });
    }
    return res.status(500).json({ error: message });
  }
}
