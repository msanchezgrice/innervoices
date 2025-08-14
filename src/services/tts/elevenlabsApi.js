/**
 * ElevenLabs simple API helpers.
 */

export async function listElevenLabsVoices(apiKey) {
  if (!apiKey) return [];
  let res;
  try {
    res = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": apiKey,
        "Accept": "application/json",
      },
    });
  } catch (e) {
    throw new Error(`Network error fetching ElevenLabs voices: ${e?.message || e}`);
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`ElevenLabs voices error ${res.status}: ${txt || "Request failed"}`);
  }
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data?.voices) ? data.voices : [];
}
