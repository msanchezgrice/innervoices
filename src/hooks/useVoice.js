import { useEffect, useRef } from "react";
import { pickBestVoice } from "./useVoices.js";
import { speakWithElevenLabs } from "../services/tts/elevenlabs.js";

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
    if (
      config?.ttsProvider === "elevenlabs" &&
      config?.elevenlabsApiKey &&
      config?.elevenlabsVoiceId
    ) {
      try {
        // Cancel any existing playback first
        try {
          controllerRef.current?.cancel?.();
        } catch {}

        const controller = await speakWithElevenLabs(
          text,
          {
            apiKey: config.elevenlabsApiKey,
            voiceId: config.elevenlabsVoiceId,
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
