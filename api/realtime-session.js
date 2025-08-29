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
    const model = body.model || process.env.OPENAI_REALTIME_MODEL || process.env.VITE_OPENAI_REALTIME_MODEL || "gpt-realtime";
    const voice = body.voice || process.env.OPENAI_REALTIME_VOICE || process.env.VITE_OPENAI_REALTIME_VOICE || "cedar";

    // Build session payload. You can also include "modalities": ["text", "audio"] here.
    const payload = {
      model,
      voice,
      // You can optionally set default modalities at session level
      modalities: ["text", "audio"],
      // Register session-level tools so voice-initiated turns can call them.
      tools: [
        {
          type: "function",
          name: "generate_image",
          description: "Generate an image with the given prompt and optional size.",
          parameters: {
            type: "object",
            properties: {
              prompt: { type: "string", description: "Detailed image prompt" },
              size: {
                type: "string",
                enum: ["512x512", "1024x1024", "2048x2048"],
                description: "Image size"
              }
            },
            required: ["prompt"]
          }
        }
      ],
      tool_choice: "auto",
      // You can set "instructions" server-side if you want a fixed system prompt,
      // but we will send instructions per-response from the client for flexibility.
    };

    async function createSession(usingModel) {
      const bodyJson = JSON.stringify({ ...payload, model: usingModel });
      const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "realtime=v1"
        },
        body: bodyJson,
      });
      const text = await r.text();
      return { ok: r.ok, status: r.status, text, model: usingModel };
    }

    // Try primary model first; on failure, fallback to preview once
    const primary = await createSession(model);
    let final = primary;

    const PREVIEW_MODEL = "gpt-4o-realtime-preview";
    if (!primary.ok && model !== PREVIEW_MODEL) {
      const fallback = await createSession(PREVIEW_MODEL);
      if (fallback.ok) {
        final = fallback;
        res.setHeader("X-Realtime-Fallback", "1");
      }
    }

    if (!final.ok) {
      res.status(final.status).send(final.text);
      return;
    }

    // Pass-through JSON result, with the model actually used
    res.setHeader("Content-Type", "application/json");
    res.setHeader("X-Realtime-Model", final.model);
    res.status(200).send(final.text);
  } catch (err) {
    res.status(500).json({ error: err?.message || "Unknown error creating realtime session" });
  }
}
