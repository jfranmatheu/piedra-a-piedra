/**
 * Vercel Serverless — proxy a NVIDIA NIM chat completions.
 * La API key la envía el cliente (no se almacena en el servidor).
 *
 * POST {
 *   apiKey: string,
 *   model: string,
 *   messages: { role, content }[],
 *   temperature?: number,
 *   max_tokens?: number
 * }
 */

import { processNimChat, readJsonBody } from "./nim-chat-core.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = readJsonBody(req);
    const { status, json } = await processNimChat(body);
    return res.status(status).json(json);
  } catch (e) {
    console.error("nim-chat", e);
    return res.status(500).json({
      error: e.message || "Error proxy NVIDIA NIM",
    });
  }
}
