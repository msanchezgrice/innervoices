/**
 * POST /api/realtime-session
 * Creates an ephemeral OpenAI Realtime session token for WebRTC clients.
 * Docs: https://platform.openai.com/docs/guides/realtime#websocket-or-webrtc
 *
 * Request body (optional):
 * {
 *   "model": "gpt-4o-realtime-preview-2024-12-17",
 *   "voice": "alloy"
 * }
 *
 * Response:
 * 200 OK
 * {
 *   ... upstream session object ...,
 *   "client_secret": { "value": "ephemeral_token_here", "expires_at": ... }
 * }
 */
export default async function handler(req, res) {
  // Basic CORS for local dev. Vercel will handle prod domain.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    res.status(500).json({ error: "Missing OPENAI_API_KEY (server env)" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const model = body.model || process.env.OPENAI_REALTIME_MODEL || process.env.VITE_OPENAI_REALTIME_MODEL || "gpt-4o-realtime-preview";
    const voice = body.voice || process.env.OPENAI_REALTIME_VOICE || process.env.VITE_OPENAI_REALTIME_VOICE || "alloy";

    // Build session payload. You can also include "modalities": ["text", "audio"] here.
    const payload = {
      model,
      voice,
      // You can optionally set default modalities at session level
      modalities: ["text", "audio"],
      // You can set "instructions" server-side if you want a fixed system prompt,
      // but we will send instructions per-response from the client for flexibility.
    };

    const upstream = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1"
      },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      // Provide useful diagnostics upstream
      res.status(upstream.status).send(text);
      return;
    }

    // Pass-through JSON result from OpenAI
    res.setHeader("Content-Type", "application/json");
    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ error: err?.message || "Unknown error creating realtime session" });
  }
}
