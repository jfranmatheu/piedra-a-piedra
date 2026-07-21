/**
 * NVIDIA NIM credentials & prefs — solo en el navegador del usuario.
 * La API key nunca se guarda en Supabase.
 */
import { DEFAULT_NIM_MODEL, NIM_MODELS } from "./nimModels";

const STORAGE_KEY = "piedra-nim-settings-v1";
const EVENT = "piedra-nim-settings";

function readRaw() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function resolveModel(id) {
  if (typeof id === "string" && id && NIM_MODELS.some((m) => m.id === id)) {
    return id;
  }
  return DEFAULT_NIM_MODEL;
}

export function getNimSettings() {
  const raw = readRaw();
  return {
    apiKey: typeof raw.apiKey === "string" ? raw.apiKey : "",
    model: resolveModel(raw.model),
  };
}

export function setNimSettings( partial ) {
  const next = { ...getNimSettings(), ...partial };
  if (partial.apiKey != null) {
    next.apiKey = String(partial.apiKey).trim();
  }
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ apiKey: next.apiKey, model: next.model })
  );
  window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  return next;
}

export function setNimApiKey(apiKey) {
  return setNimSettings({ apiKey });
}

export function clearNimApiKey() {
  return setNimSettings({ apiKey: "" });
}

export function hasNimApiKey() {
  return !!getNimSettings().apiKey;
}

export function maskNimApiKey(key) {
  const k = String(key || "");
  if (k.length < 12) return k ? "••••••••" : "";
  return `${k.slice(0, 7)}…${k.slice(-4)}`;
}

/** Suscribirse a cambios (misma pestaña + storage). */
export function subscribeNimSettings(cb) {
  const onCustom = (e) => cb(e.detail || getNimSettings());
  const onStorage = (e) => {
    if (e.key === STORAGE_KEY || e.key === null) cb(getNimSettings());
  };
  window.addEventListener(EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

export const NIM_SIGNIN_URL = "https://build.nvidia.com/models?modal=signin";
export const NIM_API_KEYS_URL = "https://build.nvidia.com/settings/api-keys";
