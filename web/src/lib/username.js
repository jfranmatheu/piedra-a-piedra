/**
 * Username rules for the platform (public handle, never the email).
 * Matches DB: profiles_username_format ^[a-z0-9_]{3,32}$
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 32;
export const USERNAME_PATTERN = /^[a-z0-9_]+$/;

/** Reserved / impersonation / system handles (lowercase). */
export const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "admins",
  "root",
  "system",
  "sys",
  "support",
  "help",
  "mod",
  "moderator",
  "staff",
  "owner",
  "api",
  "null",
  "undefined",
  "me",
  "self",
  "you",
  "everyone",
  "all",
  "team",
  "platform",
  "piedra",
  "piedraapiedra",
  "official",
  "security",
  "billing",
  "noreply",
  "no_reply",
  "postmaster",
  "webmaster",
  "www",
  "http",
  "https",
  "login",
  "logout",
  "signup",
  "register",
  "invite",
  "settings",
  "profile",
  "user",
  "users",
  "test",
  "demo",
]);

export function normalizeUsername(raw) {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

/**
 * Sanitize while typing: strip invalid chars, force lower, cap length.
 */
export function sanitizeUsernameInput(raw) {
  return String(raw ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, USERNAME_MAX);
}

/**
 * @returns {string|null} error message or null if valid
 */
export function validateUsername(raw) {
  const u = normalizeUsername(raw);

  if (!u) return "Elige un username";
  if (u.length < USERNAME_MIN) {
    return `Mínimo ${USERNAME_MIN} caracteres`;
  }
  if (u.length > USERNAME_MAX) {
    return `Máximo ${USERNAME_MAX} caracteres`;
  }
  if (!USERNAME_PATTERN.test(u)) {
    return "Solo letras minúsculas, números y guion bajo (_). Sin espacios ni caracteres especiales.";
  }
  if (u.startsWith("_") || u.endsWith("_")) {
    return "No puede empezar ni terminar con guion bajo";
  }
  if (RESERVED_USERNAMES.has(u)) {
    return "Este username está reservado y no se puede usar";
  }
  // block obvious admin* / root* impersonation
  if (/^(admin|root|system|mod|staff)/.test(u)) {
    return "Este username no está permitido";
  }
  return null;
}

export const USERNAME_HELP = {
  title: "¿Para qué sirve el username?",
  points: [
    "Es tu identidad pública en la plataforma (por ejemplo @maria).",
    "Otros miembros te invitan a proyectos con tu username, no con tu email.",
    "Tu email permanece privado: solo lo usa el sistema para acceso e invitaciones de plataforma.",
    "Puedes cambiarlo cuando quieras desde tu perfil.",
  ],
};
