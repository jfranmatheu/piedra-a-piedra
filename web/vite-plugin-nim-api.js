/**
 * Dev-only: sirve POST /api/nim-chat en el servidor de Vite
 * (evita 404 + CORS al llamar a NVIDIA desde el browser).
 */
import {
  processNimChat,
  readNodeRequestBody,
} from "../api/nim-chat-core.js";

function sendJson(res, status, json) {
  if (res.writableEnded) return;
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(json));
}

export function nimChatDevPlugin() {
  return {
    name: "piedra-nim-chat-dev",
    configureServer(server) {
      // Evitar que Node cierre conexiones largas a NIM (default ~ headers/request timeouts)
      const bumpTimeouts = () => {
        const http = server.httpServer;
        if (!http) return;
        try {
          http.setTimeout(0);
          http.headersTimeout = 0;
          http.requestTimeout = 0;
          if (typeof http.keepAliveTimeout === "number") {
            http.keepAliveTimeout = 120_000;
          }
        } catch {
          /* ignore */
        }
      };
      bumpTimeouts();
      server.httpServer?.once("listening", bumpTimeouts);

      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || "").split("?")[0];
        if (url !== "/api/nim-chat") {
          next();
          return;
        }

        // Desactivar timeout de socket en esta petición
        try {
          req.setTimeout?.(0);
          res.setTimeout?.(0);
          req.socket?.setTimeout?.(0);
        } catch {
          /* ignore */
        }

        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type");
          res.end();
          return;
        }

        if (req.method !== "POST") {
          sendJson(res, 405, { error: "Method not allowed" });
          return;
        }

        const started = Date.now();
        try {
          const body = await readNodeRequestBody(req);
          console.log(
            `[nim-chat] → ${body.model || "?"} tokens≤${body.max_tokens ?? "def"}`
          );
          const { status, json } = await processNimChat(body);
          console.log(
            `[nim-chat] ← ${status} in ${((Date.now() - started) / 1000).toFixed(1)}s`
          );
          sendJson(res, status, json);
        } catch (e) {
          console.error("[nim-chat dev]", e);
          sendJson(res, 500, {
            error: e.message || "Error proxy NVIDIA NIM (dev)",
          });
        }
      });
    },
  };
}
