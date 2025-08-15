/**
 * ElevenLabs TTS service (non-streaming, simple and reliable).
 * Docs: https://api.elevenlabs.io
 *
 * Basic usage:
 * const controller = await speakWithElevenLabs("Hello world", {
 *   apiKey: "...",
 *   voiceId: "...", // required
 *   modelId: "eleven_multilingual_v2" // optional
 * }, { onStart, onEnd });
 *
 * // To cancel playback:
 * controller?.cancel();
 */

export async function speakWithElevenLabs(
  text,
  { apiKey, voiceId, modelId = "eleven_flash_v2_5", stability = 0.5, similarity_boost = 0.75 } = {},
  { onStart, onEnd } = {}
) {
  console.log("[ElevenLabs] TTS request", {
    textLength: text?.length || 0,
    voiceId,
    modelId,
    hasApiKey: !!apiKey,
    timestamp: new Date().toISOString()
  });
  
  if (!text || !apiKey || !voiceId) {
    console.error("[ElevenLabs] Missing required parameters", { hasText: !!text, hasApiKey: !!apiKey, hasVoiceId: !!voiceId });
    throw new Error("Missing text, apiKey, or voiceId for ElevenLabs TTS");
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;
  console.log("[ElevenLabs] Calling:", url);
  
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability,
          similarity_boost,
        },
      }),
    });
  } catch (fetchError) {
    console.error("[ElevenLabs] Fetch error:", fetchError);
    throw new Error(`Network error calling ElevenLabs: ${fetchError.message}`);
  }
  
  console.log("[ElevenLabs] Response status:", res.status, res.statusText);

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[ElevenLabs] API Error:", {
      status: res.status,
      statusText: res.statusText,
      response: errText,
      timestamp: new Date().toISOString()
    });
    throw new Error(`ElevenLabs error ${res.status}: ${errText}`);
  }

  const blob = await res.blob();
  console.log("[ElevenLabs] Audio blob received, size:", blob.size);
  
  const objectUrl = URL.createObjectURL(blob);
  const audio = new Audio(objectUrl);
  audio.preload = "auto";

  const cleanup = () => {
    try {
      audio.pause();
      audio.src = "";
      URL.revokeObjectURL(objectUrl);
    } catch {}
    onEnd && onEnd();
  };

  audio.onplay = () => {
    onStart && onStart();
  };
  audio.onended = cleanup;
  audio.onerror = cleanup;

  // Some browsers require a user gesture for audio; caller ensures context.
  try {
    await audio.play();
    console.log("[ElevenLabs] Audio playback started");
  } catch (e) {
    console.error("[ElevenLabs] Audio playback failed:", e);
    // If autoplay fails, still surface as error to caller
    cleanup();
    throw e;
  }

  return {
    cancel: cleanup,
    element: audio,
  };
}
