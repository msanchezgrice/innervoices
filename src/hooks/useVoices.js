import { useEffect, useState } from "react";

/**
 * Returns a stable list of available SpeechSynthesis voices.
 * Waits for voices to load via onvoiceschanged.
 */
export function useVoices() {
  const [voices, setVoices] = useState(() => {
    try {
      return window.speechSynthesis?.getVoices?.() || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    const load = () => {
      try {
        const list = synth.getVoices() || [];
        setVoices(list.slice().sort((a, b) => (a.name || "").localeCompare(b.name || "")));
      } catch {
        setVoices([]);
      }
    };

    load();
    // Some browsers fire this after voices are actually ready
    synth.onvoiceschanged = load;

    // Fallback: try again shortly
    const t = setTimeout(load, 800);
    return () => {
      try {
        if (synth.onvoiceschanged === load) synth.onvoiceschanged = null;
      } catch {}
      clearTimeout(t);
    };
  }, []);

  return voices;
}

/**
 * Pick a "best" default voice from a list with heuristics favoring
 * high-quality cloud voices when present.
 */
export function pickBestVoice(voices, preferredName = "", preferredLang = "en-US") {
  if (!voices || voices.length === 0) return null;

  if (preferredName) {
    const exact = voices.find((v) => v.name === preferredName);
    if (exact) return exact;
    const fuzzy = voices.find((v) => v.name.toLowerCase().includes(preferredName.toLowerCase()));
    if (fuzzy) return fuzzy;
  }

  const byLang = voices.filter((v) => (v.lang || "").toLowerCase().startsWith(preferredLang.toLowerCase()));
  const candidates = byLang.length ? byLang : voices;

  // Preference order (best first)
  const namePrefs = [
    /microsoft.*natural/i,
    /microsoft/i,
    /google us english/i,
    /google english/i,
    /google/i,
    /siri/i,
  ];

  for (const rx of namePrefs) {
    const m = candidates.find((v) => rx.test(v.name));
    if (m) return m;
  }

  // Fallback to first candidate in language, else first voice
  return candidates[0] || voices[0];
}
