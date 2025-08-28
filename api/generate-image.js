/**
 * POST /api/generate-image
 * Generates an image using OpenAI's image generation model (gpt-image-1).
 * 
 * Body:
 * {
 *   "prompt": "A friendly robot helping a human write code",
 *   "size": "1024x1024", // optional, default 1024x1024
 *   "quality": "standard" // or "high" if your plan supports
 * }
 * 
 * Response:
 * 200 OK
 * {
 *   "image_base64": "data:image/png;base64,....",
 *   "revised_prompt": "..."
 * }
 */
export default async function handler(req, res) {
  // Basic CORS for local dev
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
    const prompt = (body.prompt || "").trim();
    if (!prompt) {
      res.status(400).json({ error: "Missing prompt" });
      return;
    }

    const requestedSize = body.size || process.env.IMAGE_SIZE || process.env.VITE_IMAGE_SIZE || "1024x1024";
    const allowedSizes = new Set(["512x512", "1024x1024", "1792x1024", "1024x1792"]);
    const size = allowedSizes.has(requestedSize) ? requestedSize : "1024x1024";

    // Prefer the new 'v1/images' endpoint for gpt-image-1.
    // If the deployment doesn't support it yet, we fallback to 'v1/images/generations'.
    const payload = {
      model: "gpt-image-1",
      prompt,
      size
      // background: "transparent" // Uncomment if you want transparent backgrounds and your plan supports it
    };

    async function callImagesGenerations() {
      const r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const text = await r.text();
      return { ok: r.ok, status: r.status, text };
    }

    const result = await callImagesGenerations();

    if (!result.ok) {
      let msg = result.text;
      try {
        const parsed = JSON.parse(result.text);
        msg = parsed?.error?.message || msg;
      } catch {}
      res.status(result.status).json({ error: msg || "Image generation failed", detail: result.text });
      return;
    }

    let data;
    try {
      data = JSON.parse(result.text);
    } catch {
      res.status(500).json({ error: "Failed to parse image API response" });
      return;
    }

    const first = data?.data?.[0];
    const b64 = first?.b64_json;
    const revised = first?.revised_prompt || data?.revised_prompt || null;

    if (!b64) {
      res.status(502).json({ error: "No image returned from OpenAI" });
      return;
    }

    const base64DataUri = `data:image/png;base64,${b64}`;
    res.status(200).json({
      image_base64: base64DataUri,
      revised_prompt: revised
    });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Unknown error generating image" });
  }
}
