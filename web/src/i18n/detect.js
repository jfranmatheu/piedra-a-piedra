/**
 * Auto language: Spanish if browser prefers es* OR timezone looks Hispanic;
 * otherwise neutral English. Manual choice stored in localStorage wins.
 */

export const LANG_STORAGE_KEY = "piedra-lang";
export const SUPPORTED_LANGS = ["es", "en"];

/** IANA zones common in Spanish-speaking countries (Spain + LATAM). */
const SPANISH_TIMEZONES = new Set([
  "Europe/Madrid",
  "Atlantic/Canary",
  "Africa/Ceuta",
  "America/Mexico_City",
  "America/Cancun",
  "America/Merida",
  "America/Monterrey",
  "America/Tijuana",
  "America/Hermosillo",
  "America/Chihuahua",
  "America/Mazatlan",
  "America/Bahia_Banderas",
  "America/Bogota",
  "America/Lima",
  "America/Guayaquil",
  "America/Caracas",
  "America/La_Paz",
  "America/Asuncion",
  "America/Santiago",
  "America/Punta_Arenas",
  "Pacific/Easter",
  "America/Argentina/Buenos_Aires",
  "America/Argentina/Cordoba",
  "America/Argentina/Mendoza",
  "America/Argentina/Salta",
  "America/Argentina/Tucuman",
  "America/Argentina/Ushuaia",
  "America/Montevideo",
  "America/Sao_Paulo", // Brazil often PT; keep EN unless browser says es
  "America/Havana",
  "America/Santo_Domingo",
  "America/Puerto_Rico",
  "America/Panama",
  "America/Costa_Rica",
  "America/Guatemala",
  "America/El_Salvador",
  "America/Tegucigalpa",
  "America/Managua",
  "America/Belize",
  "America/New_York", // mixed; don't force ES from TZ alone if only this
]);

// Prefer explicit LATAM/Spain zones only (exclude generic US)
const SPANISH_TZ_PREFIXES = [
  "America/Argentina/",
  "America/Mexico_",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Caracas",
  "America/Guayaquil",
  "America/La_Paz",
  "America/Asuncion",
  "America/Montevideo",
  "America/Havana",
  "America/Santo_Domingo",
  "America/Puerto_Rico",
  "America/Panama",
  "America/Costa_Rica",
  "America/Guatemala",
  "America/El_Salvador",
  "America/Tegucigalpa",
  "America/Managua",
  "America/Mexico_City",
  "America/Cancun",
  "America/Monterrey",
  "America/Tijuana",
  "Europe/Madrid",
  "Atlantic/Canary",
];

function browserPrefersSpanish() {
  if (typeof navigator === "undefined") return false;
  const list = [
    ...(navigator.languages || []),
    navigator.language,
    navigator.userLanguage,
  ].filter(Boolean);
  return list.some((l) => String(l).toLowerCase().startsWith("es"));
}

function timezoneLooksSpanish() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (SPANISH_TIMEZONES.has(tz)) {
      // São Paulo is Portuguese-primary — only if also browser es
      if (tz === "America/Sao_Paulo") return false;
      // New_York is too broad
      if (tz === "America/New_York") return false;
      return true;
    }
    return SPANISH_TZ_PREFIXES.some(
      (p) => tz === p || tz.startsWith(p.replace(/_$/, ""))
    );
  } catch {
    return false;
  }
}

/**
 * @returns {'es'|'en'}
 */
export function detectLanguage() {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "es" || stored === "en") return stored;
  } catch {
    /* private mode */
  }

  // 1) Browser UI language is the strongest non-geo signal for "country preference"
  if (browserPrefersSpanish()) return "es";

  // 2) Timezone in Spain / LATAM when browser is English but user is there
  if (timezoneLooksSpanish()) return "es";

  return "en";
}

export function persistLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = lang;
  }
}
