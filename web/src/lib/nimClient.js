/**
 * Cliente front → /api/nim-chat → NVIDIA NIM
 * En dev, Vite sirve /api/nim-chat (vite-plugin-nim-api).
 * En prod, Vercel api/nim-chat.js.
 * Nunca se llama a NVIDIA desde el browser (CORS bloquea).
 */
import { getNimSettings } from "./nimSettings";
import {
  buildNimSystemPrompt,
  buildNimUserPrompt,
  extractStonesFromAiResponse,
} from "./stonesPrompt";

export async function nimChatCompletions({
  apiKey,
  model,
  messages,
  temperature = 0.2,
  max_tokens = 8192,
}) {
  let res;
  try {
    res = await fetch("/api/nim-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey,
        model,
        messages,
        temperature,
        max_tokens,
      }),
    });
  } catch (e) {
    throw new Error(
      e.message ||
        "No se pudo contactar con /api/nim-chat. Reinicia el dev server (npm run dev)."
    );
  }

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    throw new Error(
      res.status === 404
        ? "Proxy NIM no disponible (404). Reinicia Vite para cargar vite-plugin-nim-api."
        : `Proxy NIM respondió sin JSON (HTTP ${res.status}).`
    );
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `NIM HTTP ${res.status}`);
  }
  return json;
}

/**
 * Edita un .stones con el prompt del usuario.
 * @returns {{ stonesText: string, raw: string, model: string, usage: object|null }}
 */
export async function nimEditStones({
  stonesText,
  userPrompt,
  mentionsContext = "",
  model,
  apiKey,
  lang = "es",
}) {
  const settings = getNimSettings();
  const key = (apiKey || settings.apiKey || "").trim();
  const mdl = model || settings.model;
  if (!key) throw new Error("Configura tu API key de NVIDIA NIM en Ajustes");

  const system = buildNimSystemPrompt(lang);
  const user = buildNimUserPrompt({
    stonesText,
    userPrompt,
    mentionsContext,
    lang,
  });

  // Free tier: respuestas largas provocan 504 en la cola de NVIDIA.
  // 4k tokens de salida suelen bastar para un .stones mediano.
  const approxIn = system.length + user.length;
  const max_tokens = approxIn > 80_000 ? 6144 : 4096;

  const result = await nimChatCompletions({
    apiKey: key,
    model: mdl,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.15,
    max_tokens,
  });

  const stonesOut = extractStonesFromAiResponse(result.content);
  return {
    stonesText: stonesOut,
    raw: result.content,
    model: result.model,
    usage: result.usage,
  };
}
