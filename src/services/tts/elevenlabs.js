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
  { apiKey, voiceId, modelId = "eleven_multilingual_v2", stability = 0.5, similarity_boost = 0.75 } = {},
  { onStart, onEnd } = {}
) {
  if (!text || !apiKey || !voiceId) {
    throw new Error("Missing text, apiKey, or voiceId for ElevenLabs TTS");
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;
  const res = await fetch(url, {
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

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`ElevenLabs error ${res.status}: ${errText}`);
  }

  const blob = await res.blob();
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
  } catch (e) {
    // If autoplay fails, still surface as error to caller
    cleanup();
    throw e;
  }

  return {
    cancel: cleanup,
    element: audio,
  };
}
