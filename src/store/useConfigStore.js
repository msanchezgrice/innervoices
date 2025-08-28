import { create } from "zustand";
import { DEFAULT_CONFIG } from "../config/defaults";

const persisted = (() => {
  try {
    const raw = localStorage.getItem("iv_config");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
})();

const persistedHistory = (() => {
  try {
    const raw = localStorage.getItem("iv_response_history");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
})();

export const useConfigStore = create((set, get) => ({
  config: (() => {
    let cfg = persisted || DEFAULT_CONFIG;
    const needsMigration = !cfg?.configVersion || cfg.configVersion < 2;
    if (needsMigration) {
      cfg = {
        ...cfg,
        aiProvider: "openai-realtime",
        ttsProvider: "openai-realtime",
        voiceEnabled: true,
        openaiRealtimeVoice: cfg?.openaiRealtimeVoice || "alloy",
        openaiRealtimeModel: cfg?.openaiRealtimeModel || "gpt-4o-realtime-preview",
        enableRealtimeTools: cfg?.enableRealtimeTools !== false,
        realtimeMicEnabled: true,
        configVersion: 2,
      };
      try {
        localStorage.setItem("iv_config", JSON.stringify(cfg));
      } catch {}
    }
    return cfg;
  })(),
  responseHistory: persistedHistory, // Now an object keyed by note ID
  updateConfig: (partial) =>
    set((state) => {
      const next =
        typeof partial === "function"
          ? partial(state.config)
          : { ...state.config, ...partial };

      // Deep-merge for nested fields like useCases
      const merged = {
        ...state.config,
        ...next,
        useCases: { ...state.config.useCases, ...(next.useCases || {}) },
      };

      try {
        localStorage.setItem("iv_config", JSON.stringify(merged));
      } catch {}
      return { config: merged };
    }),

  resetConfig: () => {
    try {
      localStorage.removeItem("iv_config");
    } catch {}
    set({ config: DEFAULT_CONFIG });
  },

  // Activity
  isActive: true,
  setIsActive: (v) => set({ isActive: !!v }),
  toggleActive: () => set((state) => ({ isActive: !state.isActive })),

  // UI state
  orbState: "idle", // idle | thinking | ready | speaking | muted
  setOrbState: (s) => set({ orbState: s }),
  toggleMute: () =>
    set((state) => ({ orbState: state.orbState === "muted" ? "idle" : "muted" })),

  // Runtime trace (not persisted)
  trace: {
    prompt: "",
    systemPrompt: "",
    response: "",
    provider: "",
    model: "",
    meta: {
      personality: "",
      tone: "",
      creativity: null,
      maxTokens: null,
      commentInterval: null,
      commentProbability: null,
    },
    error: null,
    thinking: false,
    tooling: false,
    startedAt: null,
    finishedAt: null,
  },
  setTrace: (partial) =>
    set((state) => ({
      trace: { ...state.trace, ...(typeof partial === "function" ? partial(state.trace) : partial) },
    })),
  clearTrace: () =>
    set({
      trace: {
        prompt: "",
        systemPrompt: "",
        response: "",
        provider: "",
        model: "",
        meta: {
          personality: "",
          tone: "",
          creativity: null,
          maxTokens: null,
          commentInterval: null,
          commentProbability: null,
        },
        error: null,
        thinking: false,
        tooling: false,
        startedAt: null,
        finishedAt: null,
      },
    }),

  // Response History (per note)
  addResponseToHistory: (response, model, noteId, extras = {}) => 
    set((state) => {
      console.log("[Store] addResponseToHistory called with noteId:", noteId);
      
      if (!noteId) {
        console.log("[Store] No noteId provided, skipping");
        return state; // Skip if no note ID provided
      }
      
      const newEntry = {
        id: Date.now() + Math.random(), // Simple unique ID
        response,
        model,
        noteId, // Include the noteId in the entry
        timestamp: Date.now(),
        ...extras,
      };
      
      const currentNoteHistory = state.responseHistory[noteId] || [];
      console.log("[Store] Current history for note", noteId, "has", currentNoteHistory.length, "items");
      
      const newNoteHistory = [newEntry, ...currentNoteHistory].slice(0, 100); // Keep last 100 responses per note
      
      const newHistory = {
        ...state.responseHistory,
        [noteId]: newNoteHistory
      };
      
      console.log("[Store] New history object has keys:", Object.keys(newHistory));
      console.log("[Store] Note", noteId, "now has", newNoteHistory.length, "responses");
      
      try {
        localStorage.setItem("iv_response_history", JSON.stringify(newHistory));
      } catch {}
      
      return { responseHistory: newHistory };
    }),

  clearResponseHistory: (noteId) => {
    if (noteId) {
      // Clear history for specific note
      set((state) => {
        const newHistory = { ...state.responseHistory };
        delete newHistory[noteId];
        
        try {
          localStorage.setItem("iv_response_history", JSON.stringify(newHistory));
        } catch {}
        
        return { responseHistory: newHistory };
      });
    } else {
      // Clear all history
      try {
        localStorage.removeItem("iv_response_history");
      } catch {}
      set({ responseHistory: {} });
    }
  },

  getResponseHistoryForNote: (noteId) => {
    const state = get();
    return state.responseHistory[noteId] || [];
  },
}));
