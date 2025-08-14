import { useEffect, useRef } from "react";
import { pickBestVoice } from "./useVoices.js";
import { speakWithElevenLabs } from "../services/tts/elevenlabs.js";
import { listElevenLabsVoices } from "../services/tts/elevenlabsApi.js";
import { useConfigStore } from "../store/useConfigStore.js";

/**
 * Browser SpeechSynthesis wrapper.
 * Usage:
 * const { speak, cancel, isSpeaking } = useVoice(config, { onStart, onEnd });
 */
export function useVoice(config, { onStart, onEnd } = {}) {
  const speakingRef = useRef(false);
  const controllerRef = useRef(null);

  useEffect(() => {
    return () => {
      try {
        controllerRef.current?.cancel?.();
      } catch {}
      try {
        window.speechSynthesis?.cancel();
      } catch {}
    };
  }, []);

  const speak = async (text) => {
    if (!text || !config?.voiceEnabled) return;

    // Prefer ElevenLabs if configured
    if (config?.ttsProvider === "elevenlabs" && config?.elevenlabsApiKey) {
      try {
        // Resolve ElevenLabs voice ID if missing but a preferred voice name is provided
        let resolvedVoiceId = config?.elevenlabsVoiceId;
        if (!resolvedVoiceId && config?.elevenlabsVoiceName) {
          try {
            const voices = await listElevenLabsVoices(config.elevenlabsApiKey);
            const match = voices.find(
              (v) => (v?.name || "").toLowerCase() === String(config.elevenlabsVoiceName || "").toLowerCase()
            );
            if (match?.voice_id) {
              resolvedVoiceId = match.voice_id;
              try {
                // Persist for subsequent calls
                useConfigStore.getState().updateConfig({ elevenlabsVoiceId: resolvedVoiceId });
              } catch {}
            }
          } catch {
            // ignore resolution errors; will fall back to browser TTS if still missing
          }
        }

        if (resolvedVoiceId) {
          // Cancel any existing playback first
          try {
            controllerRef.current?.cancel?.();
          } catch {}

          const controller = await speakWithElevenLabs(
            text,
            {
              apiKey: config.elevenlabsApiKey,
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
          controllerRef.current = controller;
          return;
        }
      } catch {
        // Fall back to browser TTS
      }
    }

    // Browser TTS fallback
    const synth = window.speechSynthesis;
    if (!synth) return;

    try {
      synth.cancel(); // stop any ongoing utterances
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = Number(config.voiceSpeed ?? 1);
      utter.pitch = Number(config.voicePitch ?? 1);
      utter.volume = Number(config.voiceVolume ?? 0.3);

      // Choose a higher-quality voice when available (Google/Microsoft/Siri), or user-selected voice
      try {
        const voices = synth.getVoices?.() || [];
        const chosen = pickBestVoice(voices, config?.voiceName || "", "en-US");
        if (chosen) {
          utter.voice = chosen;
          if (chosen.lang) utter.lang = chosen.lang;
        }
      } catch {}

      utter.onstart = () => {
        speakingRef.current = true;
        onStart && onStart();
      };
      utter.onend = () => {
        speakingRef.current = false;
        onEnd && onEnd();
      };
      utter.onerror = () => {
        speakingRef.current = false;
        onEnd && onEnd();
      };

      synth.speak(utter);
    } catch {
      // no-op fallback
    }
  };

  const cancel = () => {
    try {
      controllerRef.current?.cancel?.();
    } catch {}
    try {
      window.speechSynthesis?.cancel();
    } catch {}
    speakingRef.current = false;
    onEnd && onEnd();
  };

  return {
    speak,
    cancel,
    isSpeaking: () => speakingRef.current,
  };
}
