/**
 * Lógica compartida del proxy NVIDIA NIM.
 * Usada por api/nim-chat.js (Vercel) y el middleware de Vite en dev.
 */

const NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MAX_BODY_CHARS = 600_000;
/** Free endpoints suelen cortar o hacer cola; 3 min es un techo razonable. */
const NIM_TIMEOUT_MS = 180_000;
const DEFAULT_MAX_TOKENS = 4096;
const HARD_MAX_TOKENS = 8192;

function friendlyNimError(status, rawMsg) {
  const msg = String(rawMsg || "").trim();
  if (status === 401 || status === 403) {
    return "API key de NVIDIA inválida o sin permiso. Revisa la key en Ajustes (build.nvidia.com/settings/api-keys).";
  }
  if (status === 404) {
    return "Modelo no encontrado en NVIDIA NIM. Elige otro modelo de la lista.";
  }
  if (status === 429) {
    return "Límite de ritmo de NVIDIA (429). Espera unos segundos o prueba un modelo más ligero.";
  }
  if (status === 503 || status === 502) {
    return "NVIDIA NIM no está disponible ahora (cola o mantenimiento). Reintenta o usa un modelo «fast».";
  }
  if (status === 504) {
    return "NVIDIA NIM agotó el tiempo de espera (504). Prueba un modelo más rápido (p. ej. Phi-4 Mini o DeepSeek Flash), reduce el tamaño del proyecto o reintenta.";
  }
  if (/timeout|timed out|gateway/i.test(msg)) {
    return "Timeout con NVIDIA NIM. Usa un modelo más rápido o reintenta en unos minutos.";
  }
  return msg || `NVIDIA NIM HTTP ${status}`;
}

function clampMaxTokens(n) {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : DEFAULT_MAX_TOKENS;
  return Math.min(HARD_MAX_TOKENS, Math.max(256, v));
}

/**
 * Acumula SSE stream de chat.completions.
 */
async function readSseContent(nimRes) {
  const text = await nimRes.text();
  // A veces devuelven JSON de error aunque se pidió stream
  if (text.trimStart().startsWith("{")) {
    try {
      const j = JSON.parse(text);
      const content = j?.choices?.[0]?.message?.content;
      if (content != null) {
        return {
          content: typeof content === "string" ? content : JSON.stringify(content),
          model: j.model || null,
          usage: j.usage || null,
        };
      }
      if (!nimRes.ok) {
        const err =
          j?.error?.message || j?.message || j?.detail || text.slice(0, 200);
        const e = new Error(String(err));
        e.status = nimRes.status;
        e.detail = j;
        throw e;
      }
    } catch (e) {
      if (e.status) throw e;
    }
  }

  let content = "";
  let model = null;
  let usage = null;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      const chunk = JSON.parse(data);
      if (chunk.model) model = chunk.model;
      if (chunk.usage) usage = chunk.usage;
      const delta = chunk.choices?.[0]?.delta?.content;
      const full = chunk.choices?.[0]?.message?.content;
      if (typeof delta === "string") content += delta;
      else if (typeof full === "string") content = full;
    } catch {
      /* ignore bad chunk */
    }
  }
  return { content, model, usage };
}

/**
 * @param {object} body
 * @returns {Promise<{ status: number, json: object }>}
 */
export async function processNimChat(body = {}) {
  const apiKey = String(body.apiKey || "").trim();
  const model = String(body.model || "").trim();
  const messages = Array.isArray(body.messages) ? body.messages : null;
  const temperature =
    typeof body.temperature === "number" ? body.temperature : 0.15;
  const max_tokens = clampMaxTokens(body.max_tokens);

  if (!apiKey) {
    return { status: 400, json: { error: "Falta apiKey de NVIDIA NIM" } };
  }
  if (!model) {
    return { status: 400, json: { error: "Falta model" } };
  }
  if (!messages || !messages.length) {
    return { status: 400, json: { error: "Faltan messages" } };
  }

  const payloadSize = JSON.stringify(messages).length;
  if (payloadSize > MAX_BODY_CHARS) {
    return {
      status: 413,
      json: {
        error:
          "El proyecto es demasiado grande para una sola petición NIM. Reduce piedras/tareas o edita por partes.",
      },
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NIM_TIMEOUT_MS);

  try {
    // stream:true suele ir mejor con colas free (menos idle gateway timeout)
    const nimRes = await fetch(NIM_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream, application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        top_p: 0.9,
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!nimRes.ok) {
      // Intentar leer error JSON
      let errMsg = "";
      let detail = null;
      try {
        const t = await nimRes.text();
        try {
          detail = JSON.parse(t);
          errMsg =
            detail?.error?.message ||
            detail?.message ||
            detail?.detail ||
            t.slice(0, 300);
        } catch {
          errMsg = t.slice(0, 300);
        }
      } catch {
        errMsg = "";
      }
      return {
        status: nimRes.status,
        json: {
          error: friendlyNimError(nimRes.status, errMsg),
          detail,
        },
      };
    }

    const { content, model: outModel, usage } = await readSseContent(nimRes);

    if (!content || !String(content).trim()) {
      // Fallback no-stream (algunos modelos free no streamean bien)
      return await processNimChatNonStream({
        apiKey,
        model,
        messages,
        temperature,
        max_tokens,
        signal: controller.signal,
      });
    }

    return {
      status: 200,
      json: {
        content: String(content),
        model: outModel || model,
        usage: usage || null,
      },
    };
  } catch (e) {
    if (e?.name === "AbortError") {
      return {
        status: 504,
        json: {
          error: friendlyNimError(
            504,
            "Timeout local tras 3 min esperando a NVIDIA"
          ),
        },
      };
    }
    return {
      status: 502,
      json: {
        error: friendlyNimError(502, e.message || "No se pudo contactar con NVIDIA NIM"),
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

async function processNimChatNonStream({
  apiKey,
  model,
  messages,
  temperature,
  max_tokens,
  signal,
}) {
  const nimRes = await fetch(NIM_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
      top_p: 0.9,
      stream: false,
    }),
    signal,
  });

  const text = await nimRes.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return {
      status: nimRes.status || 502,
      json: {
        error: friendlyNimError(
          nimRes.status || 502,
          `Respuesta no JSON (${nimRes.status})`
        ),
        detail: text.slice(0, 400),
      },
    };
  }

  if (!nimRes.ok) {
    const errMsg =
      json?.error?.message ||
      json?.message ||
      json?.detail ||
      `HTTP ${nimRes.status}`;
    return {
      status: nimRes.status,
      json: { error: friendlyNimError(nimRes.status, errMsg), detail: json },
    };
  }

  const content = json?.choices?.[0]?.message?.content;
  if (content == null || content === "") {
    return {
      status: 502,
      json: { error: "Respuesta NIM sin contenido", detail: json },
    };
  }

  return {
    status: 200,
    json: {
      content: typeof content === "string" ? content : JSON.stringify(content),
      model: json.model || model,
      usage: json.usage || null,
    },
  };
}

export function readJsonBody(req) {
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

/** Lee el body raw de un IncomingMessage de Node (Vite middleware). */
export async function readNodeRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Body JSON inválido");
  }
}
