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
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
})();

export const useConfigStore = create((set, get) => ({
  config: persisted || DEFAULT_CONFIG,
  responseHistory: persistedHistory,
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

  // Response History
  addResponseToHistory: (response, model) => 
    set((state) => {
      const newEntry = {
        id: Date.now() + Math.random(), // Simple unique ID
        response,
        model,
        timestamp: Date.now(),
      };
      
      const newHistory = [newEntry, ...state.responseHistory].slice(0, 100); // Keep last 100 responses
      
      try {
        localStorage.setItem("iv_response_history", JSON.stringify(newHistory));
      } catch {}
      
      return { responseHistory: newHistory };
    }),

  clearResponseHistory: () => {
    try {
      localStorage.removeItem("iv_response_history");
    } catch {}
    set({ responseHistory: [] });
  },
}));
