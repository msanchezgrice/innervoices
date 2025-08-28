import { useEffect, useRef } from "react";
import { speakWithElevenLabs } from "../services/tts/elevenlabs.js";
import { listElevenLabsVoices } from "../services/tts/elevenlabsApi.js";
import { useConfigStore } from "../store/useConfigStore.js";
import { useRealtime } from "./useRealtime.js";

/**
 * Unified Voice output hook.
 * - Default: OpenAI Realtime audio (WebRTC remote audio track)
 * - Fallback: ElevenLabs REST TTS
 *
 * Usage:
 * const { speak, cancel, isSpeaking } = useVoice(config, { onStart, onEnd });
 */
export function useVoice(config, { onStart, onEnd } = {}) {
  const speakingRef = useRef(false);
  const ttsControllerRef = useRef(null); // used by ElevenLabs

  // Realtime client for audio output
  const realtime = useRealtime(config, {
    onAudioStart: () => {
      speakingRef.current = true;
      try {
        onStart && onStart();
      } catch {}
    },
    onAudioEnd: () => {
      speakingRef.current = false;
      try {
        onEnd && onEnd();
      } catch {}
    },
    onError: (e) => {
      // No-op here; caller may have error handlers higher up
      // console.error("[useVoice] Realtime error:", e);
    },
  });

  useEffect(() => {
    return () => {
      try {
        ttsControllerRef.current?.cancel?.();
      } catch {}
      try {
        realtime?.disconnect?.();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speak = async (text) => {
    if (!text || !config?.voiceEnabled) return;

    // Prefer ElevenLabs env key over panel key
    const envEL =
      import.meta.env.VITE_ELEVENLABS_API_KEY || import.meta.env.ELEVEN_LABS_API_KEY || "";
    const hasEnvEL = !!(envEL && String(envEL).trim());
    const apiKeyToUse = hasEnvEL ? envEL : (config?.elevenlabsApiKey || "");

    // Prefer ElevenLabs if explicitly selected
    if (config?.ttsProvider === "elevenlabs" && apiKeyToUse) {
      try {
        // Resolve ElevenLabs voice ID if missing but a preferred voice name is provided
        let resolvedVoiceId = config?.elevenlabsVoiceId;
        if (!resolvedVoiceId && config?.elevenlabsVoiceName) {
          try {
            const voices = await listElevenLabsVoices(apiKeyToUse);
            const match = voices.find(
              (v) =>
                (v?.name || "").toLowerCase() ===
                String(config.elevenlabsVoiceName || "").toLowerCase()
            );
            if (match?.voice_id) {
              resolvedVoiceId = match.voice_id;
              try {
                // Persist for subsequent calls
                useConfigStore
                  .getState()
                  .updateConfig({ elevenlabsVoiceId: resolvedVoiceId });
              } catch {}
            }
          } catch {
            // ignore resolution errors; will continue without voice id
          }
        }

        if (resolvedVoiceId) {
          // Cancel any existing playback first
          try {
            ttsControllerRef.current?.cancel?.();
          } catch {}

          const controller = await speakWithElevenLabs(
            text,
            {
              apiKey: apiKeyToUse,
              voiceId: resolvedVoiceId,
            },
            {
              onStart: () => {
                speakingRef.current = true;
                onStart && onStart();
              },
              onEnd: () => {
                speakingRef.current = false;
                onEnd && onEnd();
              },
            }
          );
          ttsControllerRef.current = controller;
          return;
        }
      } catch {
        // Fall through to realtime if ElevenLabs fails
      }
    }

    // Default: OpenAI Realtime audio
    try {
      // Cancel any previous EL controller
      try {
        ttsControllerRef.current?.cancel?.();
      } catch {}

      // Ensure connection (no mic needed for output)
      await realtime.connect({ micEnabled: false });

      // Send text with audio+text modalities (audio will play via remote track)
      realtime.sendText(text, { modalities: ["audio", "text"] });
    } catch {
      // Swallow errors here; higher-level error handling may exist
    }
  };

  const cancel = () => {
    try {
      ttsControllerRef.current?.cancel?.();
    } catch {}
    try {
      realtime.cancel();
    } catch {}
    speakingRef.current = false;
    try {
      onEnd && onEnd();
    } catch {}
  };

  return {
    speak,
    cancel,
    isSpeaking: () => speakingRef.current,
  };
}
